-- Stage 17: verify organization integrity constraints without persisting test data.

begin;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'public_pages_organization_id_page_id_key'
      and conrelid = 'public_pages'::regclass
  ) then
    raise exception 'missing public_pages organization/page unique constraint';
  end if;
end;
$$;

do $$
declare
  missing_name text;
begin
  select expected.name
    into missing_name
  from (
    values
      ('trg_player_weapon_ratings_scope'),
      ('trg_tournament_events_scope'),
      ('trg_matches_scope'),
      ('trg_ranking_snapshots_scope'),
      ('trg_ranking_snapshot_items_scope'),
      ('trg_public_pages_scope'),
      ('trg_public_page_snapshots_scope')
  ) as expected(name)
  where not exists (
    select 1
    from pg_trigger
    where tgname = expected.name
      and not tgisinternal
  )
  limit 1;

  if missing_name is not null then
    raise exception 'missing trigger: %', missing_name;
  end if;
end;
$$;

do $$
declare
  missing_name text;
begin
  select expected.name
    into missing_name
  from (
    values
      ('idx_tournaments_org_created_at'),
      ('idx_public_pages_org_tournament'),
      ('idx_matches_tournament_event_weapon_round'),
      ('idx_ranking_snapshots_tournament_weapon_created')
  ) as expected(name)
  where not exists (
    select 1
    from pg_class
    where relname = expected.name
      and relkind = 'i'
  )
  limit 1;

  if missing_name is not null then
    raise exception 'missing index: %', missing_name;
  end if;
end;
$$;

insert into organizations (id, name, slug)
values
  ('90000000-0000-0000-0000-000000000001', 'Stage 17 Org A', 'stage-17-org-a'),
  ('90000000-0000-0000-0000-000000000002', 'Stage 17 Org B', 'stage-17-org-b');

insert into weapon_types (id, organization_id, name, slug, enabled, sort_order)
values
  ('91000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'Stage 17 Longsword', 'stage-17-longsword', true, 10),
  ('91000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000002', 'Stage 17 Sabre', 'stage-17-sabre', true, 20);

insert into players (id, organization_id, name, club)
values
  ('92000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'Stage 17 Player A', 'Validation Club A'),
  ('92000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001', 'Stage 17 Player A2', 'Validation Club A'),
  ('92000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000002', 'Stage 17 Player B', 'Validation Club B');

insert into player_weapon_ratings (player_id, weapon_type_id)
values ('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001');

insert into tournaments (id, organization_id, name, format, status, default_algorithm)
values
  ('93000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'Stage 17 Tournament A', 'single_elimination', 'active', 'hybrid'),
  ('93000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000002', 'Stage 17 Tournament B', 'single_elimination', 'active', 'hybrid');

insert into tournament_events (id, tournament_id, weapon_type_id, name, format, status)
values ('94000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'Stage 17 Event A', 'single_elimination', 'active');

insert into matches (
  id,
  tournament_id,
  event_id,
  weapon_type_id,
  round,
  player1_id,
  player2_id,
  score1,
  score2,
  winner_id
)
values (
  '95000000-0000-0000-0000-000000000001',
  '93000000-0000-0000-0000-000000000001',
  '94000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000001',
  1,
  '92000000-0000-0000-0000-000000000001',
  '92000000-0000-0000-0000-000000000002',
  15,
  12,
  '92000000-0000-0000-0000-000000000001'
);

insert into ranking_snapshots (id, tournament_id, weapon_type_id, event_id, algorithm)
values ('96000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000001', 'hybrid');

insert into ranking_snapshot_items (snapshot_id, player_id, rank, rating)
values ('96000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', 1, 1510);

insert into public_pages (
  id,
  organization_id,
  page_id,
  tournament_id,
  snapshot_id,
  default_weapon_type_id,
  title
)
values
  ('97000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'shared-page-id', '93000000-0000-0000-0000-000000000001', '96000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'Stage 17 Page A'),
  ('97000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000002', 'shared-page-id', '93000000-0000-0000-0000-000000000002', null, '91000000-0000-0000-0000-000000000002', 'Stage 17 Page B');

insert into public_page_snapshots (public_page_id, weapon_type_id, snapshot_id)
values ('97000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', '96000000-0000-0000-0000-000000000001');

do $$
declare
  succeeded boolean;
begin
  begin
    insert into player_weapon_ratings (player_id, weapon_type_id)
    values ('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000002');
    succeeded := true;
  exception when others then
    succeeded := false;
  end;
  if succeeded then
    raise exception 'expected cross-organization player rating insert to fail';
  end if;

  begin
    insert into tournament_events (tournament_id, weapon_type_id, name)
    values ('93000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000002', 'Invalid Cross Org Event');
    succeeded := true;
  exception when others then
    succeeded := false;
  end;
  if succeeded then
    raise exception 'expected cross-organization tournament event insert to fail';
  end if;

  begin
    insert into matches (
      tournament_id,
      event_id,
      weapon_type_id,
      round,
      player1_id,
      player2_id,
      score1,
      score2
    )
    values (
      '93000000-0000-0000-0000-000000000001',
      '94000000-0000-0000-0000-000000000001',
      '91000000-0000-0000-0000-000000000001',
      1,
      '92000000-0000-0000-0000-000000000001',
      '92000000-0000-0000-0000-000000000003',
      15,
      8
    );
    succeeded := true;
  exception when others then
    succeeded := false;
  end;
  if succeeded then
    raise exception 'expected cross-organization match insert to fail';
  end if;

  begin
    insert into ranking_snapshots (tournament_id, weapon_type_id, algorithm)
    values ('93000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000002', 'hybrid');
    succeeded := true;
  exception when others then
    succeeded := false;
  end;
  if succeeded then
    raise exception 'expected cross-organization ranking snapshot insert to fail';
  end if;

  begin
    insert into ranking_snapshot_items (snapshot_id, player_id, rank, rating)
    values ('96000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000003', 2, 1490);
    succeeded := true;
  exception when others then
    succeeded := false;
  end;
  if succeeded then
    raise exception 'expected cross-organization ranking snapshot item insert to fail';
  end if;

  begin
    insert into public_pages (
      organization_id,
      page_id,
      tournament_id,
      default_weapon_type_id,
      title
    )
    values (
      '90000000-0000-0000-0000-000000000001',
      'invalid-cross-org-page',
      '93000000-0000-0000-0000-000000000002',
      '91000000-0000-0000-0000-000000000001',
      'Invalid Cross Org Page'
    );
    succeeded := true;
  exception when others then
    succeeded := false;
  end;
  if succeeded then
    raise exception 'expected cross-organization public page insert to fail';
  end if;

  begin
    insert into public_page_snapshots (public_page_id, weapon_type_id, snapshot_id)
    values ('97000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000002', '96000000-0000-0000-0000-000000000001');
    succeeded := true;
  exception when others then
    succeeded := false;
  end;
  if succeeded then
    raise exception 'expected cross-organization public page snapshot insert to fail';
  end if;
end;
$$;

rollback;
