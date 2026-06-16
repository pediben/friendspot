-- 001_profiles.sql
-- User profiles — one row per auth.users entry

create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  phone        text unique not null,
  display_name text not null,
  avatar_url   text,
  bio          text,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

-- Auto-create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, phone, display_name)
  values (
    new.id,
    coalesce(new.phone, ''),
    coalesce(new.raw_user_meta_data->>'display_name', 'Friend')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Auto-update updated_at
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure touch_updated_at();

-- RLS
alter table profiles enable row level security;

-- Users can read any profile they share a circle with
create policy "profiles: readable by circle-mates" on profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from circle_members cm1
      join circle_members cm2 on cm1.circle_id = cm2.circle_id
      where cm1.user_id = auth.uid()
        and cm2.user_id = profiles.id
    )
  );

-- Users can only update their own profile
create policy "profiles: own row" on profiles
  for update using (id = auth.uid());
