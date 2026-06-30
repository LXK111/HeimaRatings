-- Stage 31: add tournament event entries for registration and seeding.

create table if not exists tournament_event_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references tournament_events(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  seed integer,
  status text not null default 'registered',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, player_id),
  check (seed is null or seed > 0),
  check (status in ('registered', 'withdrawn'))
);

create index if not exists idx_tournament_event_entries_event_seed
  on tournament_event_entries(event_id, seed nulls last, created_at);

create index if not exists idx_tournament_event_entries_player
  on tournament_event_entries(player_id);

create or replace function assert_tournament_event_entry_scope()
returns trigger
language plpgsql
as $$
declare
  event_org uuid;
  player_org uuid;
begin
  select tournaments.organization_id
    into event_org
  from tournament_events
  join tournaments on tournaments.id = tournament_events.tournament_id
  where tournament_events.id = new.event_id;

  select organization_id into player_org from players where id = new.player_id;

  if event_org is null or player_org is null or event_org <> player_org then
    raise exception 'tournament_event_entries must bind event and player in the same organization';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tournament_event_entries_scope on tournament_event_entries;
create trigger trg_tournament_event_entries_scope
before insert or update of event_id, player_id on tournament_event_entries
for each row execute function assert_tournament_event_entry_scope();

alter table tournament_event_entries enable row level security;

drop policy if exists tournament_event_entries_member_select on tournament_event_entries;
drop policy if exists tournament_event_entries_member_insert on tournament_event_entries;
drop policy if exists tournament_event_entries_member_update on tournament_event_entries;
drop policy if exists tournament_event_entries_member_delete on tournament_event_entries;

create policy tournament_event_entries_member_select
on tournament_event_entries for select
to authenticated
using (
  exists (
    select 1
    from tournament_events
    join tournaments on tournaments.id = tournament_events.tournament_id
    where tournament_events.id = tournament_event_entries.event_id
      and current_user_is_org_member(tournaments.organization_id)
  )
);

create policy tournament_event_entries_member_insert
on tournament_event_entries for insert
to authenticated
with check (
  exists (
    select 1
    from tournament_events
    join tournaments on tournaments.id = tournament_events.tournament_id
    where tournament_events.id = tournament_event_entries.event_id
      and current_user_can_write_org(tournaments.organization_id)
  )
);

create policy tournament_event_entries_member_update
on tournament_event_entries for update
to authenticated
using (
  exists (
    select 1
    from tournament_events
    join tournaments on tournaments.id = tournament_events.tournament_id
    where tournament_events.id = tournament_event_entries.event_id
      and current_user_can_write_org(tournaments.organization_id)
  )
)
with check (
  exists (
    select 1
    from tournament_events
    join tournaments on tournaments.id = tournament_events.tournament_id
    where tournament_events.id = tournament_event_entries.event_id
      and current_user_can_write_org(tournaments.organization_id)
  )
);

create policy tournament_event_entries_member_delete
on tournament_event_entries for delete
to authenticated
using (
  exists (
    select 1
    from tournament_events
    join tournaments on tournaments.id = tournament_events.tournament_id
    where tournament_events.id = tournament_event_entries.event_id
      and current_user_can_write_org(tournaments.organization_id)
  )
);
