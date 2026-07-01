-- Stage 38: verify bracket, match, and event ranking database integrity.

begin;

do $$
declare
  missing_name text;
begin
  select expected.name
    into missing_name
  from (
    values
      ('trg_matches_scope'),
      ('trg_ranking_snapshots_scope'),
      ('trg_ranking_snapshot_items_scope'),
      ('matches_member_insert'),
      ('matches_member_update'),
      ('ranking_snapshots_member_insert'),
      ('ranking_snapshot_items_member_insert')
  ) as expected(name)
  where not exists (
    select 1
    from pg_trigger
    where tgname = expected.name
      and not tgisinternal
    union all
    select 1
    from pg_policies
    where schemaname = 'public'
      and policyname = expected.name
  )
  limit 1;

  if missing_name is not null then
    raise exception 'missing stage 38 object: %', missing_name;
  end if;
end;
$$;

insert into organizations (id, name, slug)
values
  ('99000000-0000-0000-0000-000000000001', 'Stage 38 Org A', 'stage-38-org-a'),
  ('99000000-0000-0000-0000-000000000002', 'Stage 38 Org B', 'stage-38-org-b');

insert into weapon_types (id, organization_id, name, slug, enabled, sort_order)
values
  ('99100000-0000-0000-0000-000000000001', '99000000-0000-0000-0000-000000000001', 'Stage 38 Longsword', 'stage-38-longsword', true, 10),
  ('99100000-0000-0000-0000-000000000002', '99000000-0000-0000-0000-000000000002', 'Stage 38 Sabre', 'stage-38-sabre', true, 20);

insert into players (id, organization_id, name, club)
values
  ('99200000-0000-0000-0000-000000000001', '99000000-0000-0000-0000-000000000001', 'Stage 38 Player A1', 'Validation Club A'),
  ('99200000-0000-0000-0000-000000000002', '99000000-0000-0000-0000-000000000001', 'Stage 38 Player A2', 'Validation Club A'),
  ('99200000-0000-0000-0000-000000000003', '99000000-0000-0000-0000-000000000002', 'Stage 38 Player B1', 'Validation Club B');

insert into tournaments (id, organization_id, name, format, status, default_algorithm)
values
  ('99300000-0000-0000-0000-000000000001', '99000000-0000-0000-0000-000000000001', 'Stage 38 Tournament A', 'single_elimination', 'active', 'hybrid'),
  ('99300000-0000-0000-0000-000000000002', '99000000-0000-0000-0000-000000000002', 'Stage 38 Tournament B', 'single_elimination', 'active', 'hybrid');

insert into tournament_events (id, tournament_id, weapon_type_id, name, format, status)
values
  ('99400000-0000-0000-0000-000000000001', '99300000-0000-0000-0000-000000000001', '99100000-0000-0000-0000-000000000001', 'Stage 38 Event A', 'single_elimination', 'active'),
  ('99400000-0000-0000-0000-000000000002', '99300000-0000-0000-0000-000000000002', '99100000-0000-0000-0000-000000000002', 'Stage 38 Event B', 'single_elimination', 'active');

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
  winner_id,
  played_at
)
values (
  '99500000-0000-0000-0000-000000000001',
  '99300000-0000-0000-0000-000000000001',
  '99400000-0000-0000-0000-000000000001',
  '99100000-0000-0000-0000-000000000001',
  1,
  '99200000-0000-0000-0000-000000000001',
  '99200000-0000-0000-0000-000000000002',
  5,
  3,
  '99200000-0000-0000-0000-000000000001',
  now()
);

do $$
declare
  succeeded boolean;
begin
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
      '99300000-0000-0000-0000-000000000001',
      '99400000-0000-0000-0000-000000000001',
      '99100000-0000-0000-0000-000000000001',
      1,
      '99200000-0000-0000-0000-000000000001',
      '99200000-0000-0000-0000-000000000003',
      0,
      0
    );
    succeeded := true;
  exception when others then
    succeeded := false;
  end;

  if succeeded then
    raise exception 'expected cross-organization match insert to fail';
  end if;
end;
$$;

insert into ranking_snapshots (
  id,
  tournament_id,
  weapon_type_id,
  event_id,
  algorithm,
  generated_at,
  source_hash
)
values (
  '99600000-0000-0000-0000-000000000001',
  '99300000-0000-0000-0000-000000000001',
  '99100000-0000-0000-0000-000000000001',
  '99400000-0000-0000-0000-000000000001',
  'hybrid',
  now(),
  'stage-38-validation'
);

insert into ranking_snapshot_items (
  snapshot_id,
  player_id,
  rank,
  rating,
  matches_count,
  wins_count,
  losses_count,
  draws_count
)
values (
  '99600000-0000-0000-0000-000000000001',
  '99200000-0000-0000-0000-000000000001',
  1,
  1600,
  1,
  1,
  0,
  0
);

do $$
declare
  succeeded boolean;
begin
  begin
    insert into ranking_snapshots (
      tournament_id,
      weapon_type_id,
      event_id,
      algorithm,
      generated_at
    )
    values (
      '99300000-0000-0000-0000-000000000001',
      '99100000-0000-0000-0000-000000000001',
      '99400000-0000-0000-0000-000000000002',
      'hybrid',
      now()
    );
    succeeded := true;
  exception when others then
    succeeded := false;
  end;

  if succeeded then
    raise exception 'expected cross-organization event ranking snapshot insert to fail';
  end if;
end;
$$;

do $$
declare
  succeeded boolean;
begin
  begin
    insert into ranking_snapshot_items (
      snapshot_id,
      player_id,
      rank,
      rating,
      matches_count,
      wins_count,
      losses_count,
      draws_count
    )
    values (
      '99600000-0000-0000-0000-000000000001',
      '99200000-0000-0000-0000-000000000003',
      2,
      1500,
      1,
      0,
      1,
      0
    );
    succeeded := true;
  exception when others then
    succeeded := false;
  end;

  if succeeded then
    raise exception 'expected cross-organization ranking snapshot item insert to fail';
  end if;
end;
$$;

rollback;
