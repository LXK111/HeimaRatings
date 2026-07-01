-- Stage: allow public pages to publish organization-level long-term rankings.

alter table ranking_snapshots alter column tournament_id drop not null;
alter table public_pages alter column tournament_id drop not null;

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
  select organization_id into weapon_org from weapon_types where id = new.weapon_type_id;

  if new.tournament_id is not null then
    select organization_id into tournament_org from tournaments where id = new.tournament_id;

    if tournament_org is null or weapon_org is null or tournament_org <> weapon_org then
      raise exception 'ranking_snapshots must bind tournament and weapon in the same organization';
    end if;
  elsif weapon_org is null then
    raise exception 'organization-level ranking_snapshots must bind an existing organization weapon';
  end if;

  if new.event_id is not null then
    if new.tournament_id is null then
      raise exception 'event ranking_snapshots must bind a tournament';
    end if;

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

create or replace function assert_ranking_snapshot_item_scope()
returns trigger
language plpgsql
as $$
declare
  snapshot_org uuid;
  player_org uuid;
begin
  select coalesce(tournaments.organization_id, weapon_types.organization_id)
    into snapshot_org
  from ranking_snapshots
  left join tournaments on tournaments.id = ranking_snapshots.tournament_id
  join weapon_types on weapon_types.id = ranking_snapshots.weapon_type_id
  where ranking_snapshots.id = new.snapshot_id;

  select organization_id into player_org from players where id = new.player_id;

  if snapshot_org is null or player_org is null or snapshot_org <> player_org then
    raise exception 'ranking_snapshot_items must bind player in the same organization as the snapshot';
  end if;

  return new;
end;
$$;

create or replace function assert_public_page_scope()
returns trigger
language plpgsql
as $$
declare
  tournament_org uuid;
  snapshot_org uuid;
  default_weapon_org uuid;
begin
  if new.tournament_id is not null then
    select organization_id into tournament_org from tournaments where id = new.tournament_id;

    if tournament_org is null or tournament_org <> new.organization_id then
      raise exception 'public_pages must bind tournament in the same organization';
    end if;
  end if;

  if new.snapshot_id is not null then
    select coalesce(tournaments.organization_id, weapon_types.organization_id)
      into snapshot_org
    from ranking_snapshots
    left join tournaments on tournaments.id = ranking_snapshots.tournament_id
    join weapon_types on weapon_types.id = ranking_snapshots.weapon_type_id
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

  select coalesce(tournaments.organization_id, weapon_types.organization_id) as organization_id,
         ranking_snapshots.weapon_type_id as weapon_type_id
    into snapshot_org, snapshot_weapon_type_id
  from ranking_snapshots
  left join tournaments on tournaments.id = ranking_snapshots.tournament_id
  join weapon_types on weapon_types.id = ranking_snapshots.weapon_type_id
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
