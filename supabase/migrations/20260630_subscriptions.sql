-- ── Friendspot Pro subscriptions ──────────────────────────────────────────────
--
-- Tracks IAP subscription status server-side.
-- The app writes here after a successful receipt validation (or via a webhook
-- from RevenueCat / App Store server notifications).
-- isPro = any row where user_id = auth.uid() AND status = 'active' AND expires_at > now()

create table if not exists friendspot.subscriptions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  plan         text        not null check (plan in ('monthly', 'annual')),
  status       text        not null check (status in ('active', 'trial', 'expired', 'cancelled')),
  started_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  receipt_data text,                      -- raw receipt / transaction id for audit
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Only one active subscription per user
create unique index if not exists subscriptions_active_user
  on friendspot.subscriptions (user_id)
  where status in ('active', 'trial');

alter table friendspot.subscriptions enable row level security;

-- Users can read their own subscription
create policy "Users can read own subscription"
  on friendspot.subscriptions for select
  using (auth.uid() = user_id);

-- Users can insert their own (client-side for dev; production should use service role via edge function)
create policy "Users can insert own subscription"
  on friendspot.subscriptions for insert
  with check (auth.uid() = user_id);

-- Users can update their own (e.g. cancel)
create policy "Users can update own subscription"
  on friendspot.subscriptions for update
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function friendspot.set_subscription_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger subscriptions_updated_at
  before update on friendspot.subscriptions
  for each row execute function friendspot.set_subscription_updated_at();
