-- 005_expenses.sql

create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  moment_id   uuid references moments(id) on delete cascade not null,
  paid_by     uuid references profiles(id) not null,
  amount      numeric(10,2) not null check (amount > 0),
  currency    text not null default 'USD',
  category    text check (category in ('food', 'transport', 'lodging', 'activity', 'other')),
  description text,
  created_at  timestamptz default now() not null
);

create table if not exists expense_splits (
  id          uuid primary key default gen_random_uuid(),
  expense_id  uuid references expenses(id) on delete cascade not null,
  user_id     uuid references profiles(id) not null,
  amount_owed numeric(10,2) not null check (amount_owed > 0),
  settled     boolean not null default false,
  settled_at  timestamptz,
  unique (expense_id, user_id)
);

-- Indexes
create index expenses_moment_id_idx on expenses(moment_id);
create index expense_splits_user_id_idx on expense_splits(user_id);
create index expense_splits_settled_idx on expense_splits(settled);

-- RLS
alter table expenses enable row level security;
alter table expense_splits enable row level security;

-- Expenses: visible to circle members of the parent moment
create policy "expenses: circle members only" on expenses
  for select using (
    exists (
      select 1 from moments m
      join circle_members cm on cm.circle_id = m.circle_id
      where m.id = expenses.moment_id and cm.user_id = auth.uid()
    )
  );

create policy "expenses: circle members insert" on expenses
  for insert with check (
    paid_by = auth.uid()
    and exists (
      select 1 from moments m
      join circle_members cm on cm.circle_id = m.circle_id
      where m.id = expenses.moment_id and cm.user_id = auth.uid()
    )
  );

-- Splits: only the two parties (payer and ower) can see each split
create policy "expense_splits: parties only" on expense_splits
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from expenses e
      where e.id = expense_splits.expense_id and e.paid_by = auth.uid()
    )
  );

create policy "expense_splits: payer inserts" on expense_splits
  for insert with check (
    exists (
      select 1 from expenses e
      where e.id = expense_splits.expense_id and e.paid_by = auth.uid()
    )
  );

-- Only the person who owes can mark as settled
create policy "expense_splits: debtor settles" on expense_splits
  for update using (user_id = auth.uid())
  with check (settled = true);

-- Handy view: net balance per person per moment
create or replace view moment_balances as
select
  es.user_id,
  e.moment_id,
  sum(case when es.settled then 0 else es.amount_owed end) as total_owed,
  sum(case when e.paid_by = es.user_id then e.amount else 0 end) as total_paid
from expense_splits es
join expenses e on e.id = es.expense_id
group by es.user_id, e.moment_id;
