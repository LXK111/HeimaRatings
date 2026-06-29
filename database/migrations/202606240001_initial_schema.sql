-- HEMA Ratings MVP initial schema.
-- Target: Supabase PostgreSQL.

create extension if not exists "pgcrypto";

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists weapon_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  club text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists player_weapon_ratings (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  weapon_type_id uuid not null references weapon_types(id) on delete cascade,
  initial_rating numeric(10, 2) not null default 1500,
  current_rating numeric(10, 2) not null default 1500,
  rd numeric(10, 2) not null default 350,
  sigma numeric(10, 4) not null default 0.2,
  matches_count integer not null default 0,
  wins_count integer not null default 0,
  losses_count integer not null default 0,
  draws_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, weapon_type_id),
  check (initial_rating >= 0),
  check (current_rating >= 0),
  check (rd >= 0),
  check (sigma >= 0),
  check (matches_count >= 0),
  check (wins_count >= 0),
  check (losses_count >= 0),
  check (draws_count >= 0)
);

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  format text not null default 'single_elimination',
  status text not null default 'draft',
  default_algorithm text not null default 'hybrid',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (format in ('single_elimination', 'round_robin', 'swiss', 'custom')),
  check (status in ('draft', 'active', 'completed')),
  check (default_algorithm in ('elo', 'sdr', 'glicko2', 'hybrid'))
);

create table if not exists tournament_events (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  weapon_type_id uuid not null references weapon_types(id) on delete restrict,
  name text not null,
  format text not null default 'single_elimination',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, name),
  check (format in ('single_elimination', 'round_robin', 'swiss', 'custom')),
  check (status in ('draft', 'active', 'completed'))
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  event_id uuid not null references tournament_events(id) on delete cascade,
  weapon_type_id uuid not null references weapon_types(id) on delete restrict,
  round integer not null,
  player1_id uuid not null references players(id) on delete restrict,
  player2_id uuid not null references players(id) on delete restrict,
  score1 integer not null,
  score2 integer not null,
  winner_id uuid references players(id) on delete restrict,
  played_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (round > 0),
  check (score1 >= 0),
  check (score2 >= 0),
  check (player1_id <> player2_id),
  check (winner_id is null or winner_id in (player1_id, player2_id))
);

create table if not exists ranking_snapshots (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  weapon_type_id uuid not null references weapon_types(id) on delete restrict,
  event_id uuid references tournament_events(id) on delete set null,
  algorithm text not null,
  generated_at timestamptz not null default now(),
  source_hash text,
  created_at timestamptz not null default now(),
  check (algorithm in ('elo', 'sdr', 'glicko2', 'hybrid'))
);

create table if not exists ranking_snapshot_items (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references ranking_snapshots(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  rank integer not null,
  rating numeric(10, 2) not null,
  rd numeric(10, 2),
  sigma numeric(10, 4),
  matches_count integer not null default 0,
  wins_count integer not null default 0,
  losses_count integer not null default 0,
  draws_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (snapshot_id, player_id),
  unique (snapshot_id, rank),
  check (rank > 0),
  check (rating >= 0),
  check (matches_count >= 0),
  check (wins_count >= 0),
  check (losses_count >= 0),
  check (draws_count >= 0)
);

create table if not exists public_pages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  page_id text not null,
  tournament_id uuid not null references tournaments(id) on delete cascade,
  snapshot_id uuid references ranking_snapshots(id) on delete set null,
  default_weapon_type_id uuid references weapon_types(id) on delete set null,
  title text not null,
  theme text not null default 'dark',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, page_id),
  check (theme in ('dark', 'light', 'compact'))
);

create index if not exists idx_weapon_types_org on weapon_types(organization_id);
create index if not exists idx_players_org on players(organization_id);
create index if not exists idx_player_weapon_ratings_weapon on player_weapon_ratings(weapon_type_id);
create index if not exists idx_tournaments_org on tournaments(organization_id);
create index if not exists idx_tournament_events_tournament on tournament_events(tournament_id);
create index if not exists idx_tournament_events_weapon on tournament_events(weapon_type_id);
create index if not exists idx_matches_event_round on matches(event_id, round);
create index if not exists idx_matches_weapon on matches(weapon_type_id);
create index if not exists idx_ranking_snapshots_tournament_weapon on ranking_snapshots(tournament_id, weapon_type_id);
create index if not exists idx_ranking_snapshot_items_snapshot_rank on ranking_snapshot_items(snapshot_id, rank);
create index if not exists idx_public_pages_tournament on public_pages(tournament_id);
create index if not exists idx_public_pages_org_tournament on public_pages(organization_id, tournament_id);
