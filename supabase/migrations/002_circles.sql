-- 002_circles.sql

create table if not exists circles (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  emoji        text,
  owner_id     uuid references profiles(id) not null,
  livekit_room text not null,
  created_at   timestamptz default now() not null
);

create table if not exists circle_members (
  circle_id  uuid references circles(id) on delete cascade not null,
  user_id    uuid references profiles(id) on delete cascade not null,
  role       text not null default 'member' check (role in ('admin', 'member')),
  invited_by uuid references profiles(id),
  joined_at  timestamptz default now() not null,
  primary key (circle_id, user_id)
);

-- Indexes
create index circle_members_user_id_idx on circle_members(user_id);
create index circle_members_circle_id_idx on circle_members(circle_id);

-- RLS
alter table circles enable row level security;
alter table circle_members enable row level security;

-- Circle is visible only to its members
create policy "circles: members only" on circles
  for select using (
    exists (
      select 1 from circle_members
      where circle_id = circles.id and user_id = auth.uid()
    )
  );

-- Owner can update circle
create policy "circles: owner update" on circles
  for update using (owner_id = auth.uid());

-- Owner can delete circle
create policy "circles: owner delete" on circles
  for delete using (owner_id = auth.uid());

-- Any authenticated user can create a circle (they become owner + first member)
create policy "circles: insert" on circles
  for insert with check (owner_id = auth.uid());

-- Circle members visible only within same circle
create policy "circle_members: visible to circle members" on circle_members
  for select using (
    exists (
      select 1 from circle_members cm
      where cm.circle_id = circle_members.circle_id and cm.user_id = auth.uid()
    )
  );

-- Admins can add members
create policy "circle_members: admin insert" on circle_members
  for insert with check (
    exists (
      select 1 from circle_members cm
      where cm.circle_id = circle_members.circle_id
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
    )
  );

-- Members can remove themselves; admins can remove anyone
create policy "circle_members: leave or admin remove" on circle_members
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from circle_members cm
      where cm.circle_id = circle_members.circle_id
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
    )
  );

-- Auto-add creator as admin member
create or replace function add_circle_owner_as_admin()
returns trigger language plpgsql security definer as $$
begin
  insert into circle_members (circle_id, user_id, role)
  values (new.id, new.owner_id, 'admin');
  return new;
end;
$$;

create trigger circle_created
  after insert on circles
  for each row execute procedure add_circle_owner_as_admin();
