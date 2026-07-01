-- Stage 51: add bracket slots for auditable seeding, byes, and advancement positions.

create table if not exists bracket_slots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references tournament_events(id) on delete cascade,
  round integer not null,
  slot_index integer not null,
  player_id uuid references players(id) on delete set null,
  source_match_id uuid references matches(id) on delete set null,
  status text not null default 'empty',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, round, slot_index),
  check (round > 0),
  check (slot_index > 0),
  check (status in ('empty', 'occupied', 'bye', 'advanced')),
  check (status <> 'empty' or (player_id is null and source_match_id is null)),
  check (status <> 'occupied' or player_id is not null),
  check (status <> 'bye' or player_id is not null),
  check (status <> 'advanced' or source_match_id is not null)
);

create index if not exists idx_bracket_slots_event_round
  on bracket_slots(event_id, round, slot_index);

create index if not exists idx_bracket_slots_player
  on bracket_slots(player_id);

create index if not exists idx_bracket_slots_source_match
  on bracket_slots(source_match_id);

create or replace function assert_bracket_slot_scope()
returns trigger
language plpgsql
as $$
declare
  event_tournament_id uuid;
  event_org uuid;
  player_org uuid;
  source_event_id uuid;
begin
  select tournament_events.tournament_id, tournaments.organization_id
    into event_tournament_id, event_org
  from tournament_events
  join tournaments on tournaments.id = tournament_events.tournament_id
  where tournament_events.id = new.event_id;

  if event_org is null then
    raise exception 'bracket_slots must bind an existing event';
  end if;

  if new.player_id is not null then
    select organization_id into player_org from players where id = new.player_id;

    if player_org is null or player_org <> event_org then
      raise exception 'bracket_slots must bind player in the same organization as the event';
    end if;
  end if;

  if new.source_match_id is not null then
    select event_id into source_event_id from matches where id = new.source_match_id;

    if source_event_id is null or source_event_id <> new.event_id then
      raise exception 'bracket_slots must bind source match in the same event';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_bracket_slots_scope on bracket_slots;
create trigger trg_bracket_slots_scope
before insert or update of event_id, player_id, source_match_id on bracket_slots
for each row execute function assert_bracket_slot_scope();

alter table bracket_slots enable row level security;

drop policy if exists bracket_slots_member_select on bracket_slots;
drop policy if exists bracket_slots_member_insert on bracket_slots;
drop policy if exists bracket_slots_member_update on bracket_slots;
drop policy if exists bracket_slots_member_delete on bracket_slots;

create policy bracket_slots_member_select
on bracket_slots for select
to authenticated
using (
  exists (
    select 1
    from tournament_events
    join tournaments on tournaments.id = tournament_events.tournament_id
    where tournament_events.id = bracket_slots.event_id
      and current_user_is_org_member(tournaments.organization_id)
  )
);

create policy bracket_slots_member_insert
on bracket_slots for insert
to authenticated
with check (
  exists (
    select 1
    from tournament_events
    join tournaments on tournaments.id = tournament_events.tournament_id
    where tournament_events.id = bracket_slots.event_id
      and current_user_can_write_org(tournaments.organization_id)
  )
);

create policy bracket_slots_member_update
on bracket_slots for update
to authenticated
using (
  exists (
    select 1
    from tournament_events
    join tournaments on tournaments.id = tournament_events.tournament_id
    where tournament_events.id = bracket_slots.event_id
      and current_user_can_write_org(tournaments.organization_id)
  )
)
with check (
  exists (
    select 1
    from tournament_events
    join tournaments on tournaments.id = tournament_events.tournament_id
    where tournament_events.id = bracket_slots.event_id
      and current_user_can_write_org(tournaments.organization_id)
  )
);

create policy bracket_slots_member_delete
on bracket_slots for delete
to authenticated
using (
  exists (
    select 1
    from tournament_events
    join tournaments on tournaments.id = tournament_events.tournament_id
    where tournament_events.id = bracket_slots.event_id
      and current_user_can_write_org(tournaments.organization_id)
  )
);
