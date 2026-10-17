-- Luxe Life — Supabase schema (run in the Supabase SQL editor).
-- Enable Authentication → Providers → "Anonymous sign-ins" so each browser gets its own player.

create type start_type as enum ('NEPO', 'LAPO');
create type asset_type as enum ('VEHICLE', 'RESIDENCE', 'WARDROBE', 'ACCESSORY', 'STAFF', 'BUSINESS');
create type txn_category as enum ('INCOME', 'EXPENSE', 'TAX', 'LOAN', 'SALE', 'PURCHASE');

-- Headline player row (mirrored on every cloud save; handy for leaderboards later).
create table if not exists players (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  start_type start_type not null,
  cash_balance numeric not null default 0,
  net_worth numeric not null default 0,
  prestige int not null default 0,
  energy numeric not null default 100,
  hunger numeric not null default 100,
  social numeric not null default 100,
  family_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  asset_type asset_type not null,
  name text not null,
  purchase_price numeric not null,
  current_value numeric not null,
  prestige_bonus int not null default 0,
  utility_bonus numeric not null default 0,
  upkeep_cost numeric not null default 0
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  amount numeric not null,
  category txn_category not null,
  description text,
  timestamp timestamptz not null default now()
);

-- Full game snapshot used by the MVP's Cloud Save / Cloud Load buttons.
create table if not exists saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security: players can only touch their own data.
alter table players enable row level security;
alter table assets enable row level security;
alter table transactions enable row level security;
alter table saves enable row level security;

create policy "own player" on players for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own assets" on assets for all using (auth.uid() = player_id) with check (auth.uid() = player_id);
create policy "own txns" on transactions for all using (auth.uid() = player_id) with check (auth.uid() = player_id);
create policy "own save" on saves for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
