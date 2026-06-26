-- 004_moments.sql

create table if not exists moments (
  id                  uuid primary key default gen_random_uuid(),
  circle_id           uuid references circles(id) on delete cascade not null,
  created_by          uuid references profiles(id) not null,
  title               text not null,
  event_date          date,
  has_secret_planning boolean default false not null,
  honoree_id          uuid references profiles(id),
  created_at          timestamptz default now() not null
);

-- Secret planning group: only these users see the secret tab
create table if not exists moment_members (
  moment_id uuid references moments(id) on delete cascade not null,
  user_id   uuid references profiles(id) not null,
  primary key (moment_id, user_id)
);

create table if not exists photos (
  id           uuid primary key default gen_random_uuid(),
  moment_id    uuid references moments(id) on delete cascade not null,
  uploaded_by  uuid references profiles(id) not null,
  storage_path text not null,
  caption      text,
  taken_at     timestamptz,
  created_at   timestamptz default now() not null
);

-- Indexes
create index moments_circle_id_idx on moments(circle_id);
create index photos_moment_id_idx on photos(moment_id);

-- RLS
alter table moments enable row level security;
alter table moment_members enable row level security;
alter table photos enable row level security;

-- Moments: visible to circle members UNLESS it's secret — then only to moment_members
create policy "moments: circle members can see non-secret" on moments
  for select using (
    -- User is in the circle
    exists (
      select 1 from circle_members
      where circle_id = moments.circle_id and user_id = auth.uid()
    )
    and (
      -- Either not a secret moment
      not has_secret_planning
      -- Or user is the honoree (they see it exists but not the planning)
      or honoree_id = auth.uid()
      -- Or user is in the planning group
      or exists (
        select 1 from moment_members
        where moment_id = moments.id and user_id = auth.uid()
      )
    )
  );

create policy "moments: circle members insert" on moments
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from circle_members
      where circle_id = moments.circle_id and user_id = auth.uid()
    )
  );

create policy "moments: creator update" on moments
  for update using (created_by = auth.uid());

-- moment_members: only moment_members can see the planning group
create policy "moment_members: planning group only" on moment_members
  for select using (
    exists (
      select 1 from moment_members mm
      where mm.moment_id = moment_members.moment_id and mm.user_id = auth.uid()
    )
  );

create policy "moment_members: creator manages" on moment_members
  for insert with check (
    exists (
      select 1 from moments
      where id = moment_members.moment_id and created_by = auth.uid()
    )
  );

-- Photos: visible to circle members
create policy "photos: circle members only" on photos
  for select using (
    exists (
      select 1 from moments m
      join circle_members cm on cm.circle_id = m.circle_id
      where m.id = photos.moment_id and cm.user_id = auth.uid()
    )
  );

create policy "photos: circle members insert" on photos
  for insert with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from moments m
      join circle_members cm on cm.circle_id = m.circle_id
      where m.id = photos.moment_id and cm.user_id = auth.uid()
    )
  );

create policy "photos: own delete" on photos
  for delete using (uploaded_by = auth.uid());

-- Storage bucket
-- insert into storage.buckets (id, name, public) values ('photos', 'photos', false);
