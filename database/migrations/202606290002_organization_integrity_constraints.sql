-- Stage 16: strengthen database-level organization isolation constraints.

alter table public_pages drop constraint if exists public_pages_page_id_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'public_pages_organization_id_page_id_key'
      and conrelid = 'public_pages'::regclass
  ) then
    alter table public_pages add constraint public_pages_organization_id_page_id_key
      unique (organization_id, page_id);
  end if;
end
$$;

create index if not exists idx_tournaments_org_created_at
  on tournaments(organization_id, created_at desc);

create index if not exists idx_public_pages_org_tournament
  on public_pages(organization_id, tournament_id);

create index if not exists idx_matches_tournament_event_weapon_round
  on matches(tournament_id, event_id, weapon_type_id, round);

create index if not exists idx_ranking_snapshots_tournament_weapon_created
  on ranking_snapshots(tournament_id, weapon_type_id, created_at desc);

create or replace function assert_player_weapon_rating_scope()
returns trigger
language plpgsql
as $$
declare
  player_org uuid;
  weapon_org uuid;
begin
  select organization_id into player_org from players where id = new.player_id;
  select organization_id into weapon_org from weapon_types where id = new.weapon_type_id;

  if player_org is null or weapon_org is null or player_org <> weapon_org then
    raise exception 'player_weapon_ratings must bind player and weapon in the same organization';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_player_weapon_ratings_scope on player_weapon_ratings;
create trigger trg_player_weapon_ratings_scope
before insert or update of player_id, weapon_type_id on player_weapon_ratings
for each row execute function assert_player_weapon_rating_scope();

create or replace function assert_tournament_event_scope()
returns trigger
language plpgsql
as $$
declare
  tournament_org uuid;
  weapon_org uuid;
begin
  select organization_id into tournament_org from tournaments where id = new.tournament_id;
  select organization_id into weapon_org from weapon_types where id = new.weapon_type_id;

  if tournament_org is null or weapon_org is null or tournament_org <> weapon_org then
    raise exception 'tournament_events must bind tournament and weapon in the same organization';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tournament_events_scope on tournament_events;
create trigger trg_tournament_events_scope
before insert or update of tournament_id, weapon_type_id on tournament_events
for each row execute function assert_tournament_event_scope();

create or replace function assert_match_scope()
returns trigger
language plpgsql
as $$
declare
  tournament_org uuid;
  weapon_org uuid;
  event_tournament_id uuid;
  event_weapon_type_id uuid;
  player1_org uuid;
  player2_org uuid;
  winner_org uuid;
begin
  select organization_id into tournament_org from tournaments where id = new.tournament_id;
  select organization_id into weapon_org from weapon_types where id = new.weapon_type_id;
  select tournament_id, weapon_type_id
    into event_tournament_id, event_weapon_type_id
  from tournament_events
  where id = new.event_id;
  select organization_id into player1_org from players where id = new.player1_id;
  select organization_id into player2_org from players where id = new.player2_id;

  if new.winner_id is not null then
    select organization_id into winner_org from players where id = new.winner_id;
  end if;

  if tournament_org is null or weapon_org is null or tournament_org <> weapon_org then
    raise exception 'matches must bind tournament and weapon in the same organization';
  end if;

  if event_tournament_id is null
    or event_tournament_id <> new.tournament_id
    or event_weapon_type_id <> new.weapon_type_id then
    raise exception 'matches must bind event to the same tournament and weapon';
  end if;

  if player1_org is null
    or player2_org is null
    or player1_org <> tournament_org
    or player2_org <> tournament_org
    or (new.winner_id is not null and winner_org <> tournament_org) then
    raise exception 'matches must bind players in the same organization as the tournament';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_matches_scope on matches;
create trigger trg_matches_scope
before insert or update of tournament_id, event_id, weapon_type_id, player1_id, player2_id, winner_id on matches
for each row execute function assert_match_scope();

create or replace function assert_ranking_snapshot_scope()
returns trigger
language plpgsql
as $$
declare
  tournament_org uuid;
  weapon_org uuid;
  event_tournament_id uuid;
  event_weapon_type_id uuid;
begin
  select organization_id into tournament_org from tournaments where id = new.tournament_id;
  select organization_id into weapon_org from weapon_types where id = new.weapon_type_id;

  if tournament_org is null or weapon_org is null or tournament_org <> weapon_org then
    raise exception 'ranking_snapshots must bind tournament and weapon in the same organization';
  end if;

  if new.event_id is not null then
    select tournament_id, weapon_type_id
      into event_tournament_id, event_weapon_type_id
    from tournament_events
    where id = new.event_id;

    if event_tournament_id is null
      or event_tournament_id <> new.tournament_id
      or event_weapon_type_id <> new.weapon_type_id then
      raise exception 'ranking_snapshots must bind event to the same tournament and weapon';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ranking_snapshots_scope on ranking_snapshots;
create trigger trg_ranking_snapshots_scope
before insert or update of tournament_id, weapon_type_id, event_id on ranking_snapshots
for each row execute function assert_ranking_snapshot_scope();

create or replace function assert_ranking_snapshot_item_scope()
returns trigger
language plpgsql
as $$
declare
  snapshot_org uuid;
  player_org uuid;
begin
  select tournaments.organization_id
    into snapshot_org
  from ranking_snapshots
  join tournaments on tournaments.id = ranking_snapshots.tournament_id
  where ranking_snapshots.id = new.snapshot_id;

  select organization_id into player_org from players where id = new.player_id;

  if snapshot_org is null or player_org is null or snapshot_org <> player_org then
    raise exception 'ranking_snapshot_items must bind player in the same organization as the snapshot';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ranking_snapshot_items_scope on ranking_snapshot_items;
create trigger trg_ranking_snapshot_items_scope
before insert or update of snapshot_id, player_id on ranking_snapshot_items
for each row execute function assert_ranking_snapshot_item_scope();

create or replace function assert_public_page_scope()
returns trigger
language plpgsql
as $$
declare
  tournament_org uuid;
  snapshot_org uuid;
  default_weapon_org uuid;
begin
  select organization_id into tournament_org from tournaments where id = new.tournament_id;

  if tournament_org is null or tournament_org <> new.organization_id then
    raise exception 'public_pages must bind tournament in the same organization';
  end if;

  if new.snapshot_id is not null then
    select tournaments.organization_id
      into snapshot_org
    from ranking_snapshots
    join tournaments on tournaments.id = ranking_snapshots.tournament_id
    where ranking_snapshots.id = new.snapshot_id;

    if snapshot_org is null or snapshot_org <> new.organization_id then
      raise exception 'public_pages must bind snapshot in the same organization';
    end if;
  end if;

  if new.default_weapon_type_id is not null then
    select organization_id into default_weapon_org from weapon_types where id = new.default_weapon_type_id;
    if default_weapon_org is null or default_weapon_org <> new.organization_id then
      raise exception 'public_pages must bind default weapon in the same organization';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_public_pages_scope on public_pages;
create trigger trg_public_pages_scope
before insert or update of organization_id, tournament_id, snapshot_id, default_weapon_type_id on public_pages
for each row execute function assert_public_page_scope();

create or replace function assert_public_page_snapshot_scope()
returns trigger
language plpgsql
as $$
declare
  page_org uuid;
  weapon_org uuid;
  snapshot_org uuid;
  snapshot_weapon_type_id uuid;
begin
  select organization_id into page_org from public_pages where id = new.public_page_id;
  select organization_id into weapon_org from weapon_types where id = new.weapon_type_id;

  select tournaments.organization_id as organization_id,
         ranking_snapshots.weapon_type_id as weapon_type_id
    into snapshot_org, snapshot_weapon_type_id
  from ranking_snapshots
  join tournaments on tournaments.id = ranking_snapshots.tournament_id
  where ranking_snapshots.id = new.snapshot_id;

  if page_org is null or weapon_org is null or snapshot_org is null then
    raise exception 'public_page_snapshots must bind existing page, weapon, and snapshot';
  end if;

  if page_org <> weapon_org or page_org <> snapshot_org then
    raise exception 'public_page_snapshots must bind page, weapon, and snapshot in the same organization';
  end if;

  if snapshot_weapon_type_id <> new.weapon_type_id then
    raise exception 'public_page_snapshots weapon must match snapshot weapon';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_public_page_snapshots_scope on public_page_snapshots;
create trigger trg_public_page_snapshots_scope
before insert or update of public_page_id, weapon_type_id, snapshot_id on public_page_snapshots
for each row execute function assert_public_page_snapshot_scope();
