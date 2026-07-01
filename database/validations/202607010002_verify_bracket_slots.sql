-- Stage 51: verify bracket slots schema, scope trigger, and RLS policies.

begin;

do $$
declare
  missing_name text;
begin
  select expected.name
    into missing_name
  from (
    values
      ('bracket_slots'),
      ('idx_bracket_slots_event_round'),
      ('idx_bracket_slots_player'),
      ('idx_bracket_slots_source_match'),
      ('trg_bracket_slots_scope'),
      ('bracket_slots_member_select'),
      ('bracket_slots_member_insert'),
      ('bracket_slots_member_update'),
      ('bracket_slots_member_delete')
  ) as expected(name)
  where not exists (
    select 1
    from pg_class
    where relname = expected.name
    union all
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
    raise exception 'missing stage 51 object: %', missing_name;
  end if;
end;
$$;

do $$
declare
  wrong_policy text;
begin
  select policyname
    into wrong_policy
  from pg_policies
  where schemaname = 'public'
    and tablename = 'bracket_slots'
    and cmd in ('INSERT', 'UPDATE', 'DELETE')
    and (
      qual ilike '%current_user_is_org_member%'
      or with_check ilike '%current_user_is_org_member%'
      or coalesce(qual, '') not ilike '%current_user_can_write_org%'
         and coalesce(with_check, '') not ilike '%current_user_can_write_org%'
    )
  limit 1;

  if wrong_policy is not null then
    raise exception 'bracket slot write policy does not use current_user_can_write_org: %', wrong_policy;
  end if;
end;
$$;

insert into organizations (id, name, slug)
values
  ('97000000-0000-0000-0000-000000000001', 'Stage 51 Org A', 'stage-51-org-a'),
  ('97000000-0000-0000-0000-000000000002', 'Stage 51 Org B', 'stage-51-org-b');

insert into weapon_types (id, organization_id, name, slug, enabled, sort_order)
values
  ('97100000-0000-0000-0000-000000000001', '97000000-0000-0000-0000-000000000001', 'Stage 51 Longsword', 'stage-51-longsword', true, 10),
  ('97100000-0000-0000-0000-000000000002', '97000000-0000-0000-0000-000000000002', 'Stage 51 Sabre', 'stage-51-sabre', true, 20);

insert into players (id, organization_id, name, club)
values
  ('97200000-0000-0000-0000-000000000001', '97000000-0000-0000-0000-000000000001', 'Stage 51 Player A1', 'Validation Club A'),
  ('97200000-0000-0000-0000-000000000002', '97000000-0000-0000-0000-000000000001', 'Stage 51 Player A2', 'Validation Club A'),
  ('97200000-0000-0000-0000-000000000003', '97000000-0000-0000-0000-000000000002', 'Stage 51 Player B1', 'Validation Club B'),
  ('97200000-0000-0000-0000-000000000004', '97000000-0000-0000-0000-000000000002', 'Stage 51 Player B2', 'Validation Club B');

insert into tournaments (id, organization_id, name, format, status, default_algorithm)
values
  ('97300000-0000-0000-0000-000000000001', '97000000-0000-0000-0000-000000000001', 'Stage 51 Tournament A', 'single_elimination', 'active', 'hybrid'),
  ('97300000-0000-0000-0000-000000000002', '97000000-0000-0000-0000-000000000002', 'Stage 51 Tournament B', 'single_elimination', 'active', 'hybrid');

insert into tournament_events (id, tournament_id, weapon_type_id, name, format, status)
values
  ('97400000-0000-0000-0000-000000000001', '97300000-0000-0000-0000-000000000001', '97100000-0000-0000-0000-000000000001', 'Stage 51 Event A', 'single_elimination', 'active'),
  ('97400000-0000-0000-0000-000000000002', '97300000-0000-0000-0000-000000000002', '97100000-0000-0000-0000-000000000002', 'Stage 51 Event B', 'single_elimination', 'active');

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
values
  (
    '97500000-0000-0000-0000-000000000001',
    '97300000-0000-0000-0000-000000000001',
    '97400000-0000-0000-0000-000000000001',
    '97100000-0000-0000-0000-000000000001',
    1,
    '97200000-0000-0000-0000-000000000001',
    '97200000-0000-0000-0000-000000000002',
    5,
    3,
    '97200000-0000-0000-0000-000000000001',
    now()
  ),
  (
    '97500000-0000-0000-0000-000000000002',
    '97300000-0000-0000-0000-000000000002',
    '97400000-0000-0000-0000-000000000002',
    '97100000-0000-0000-0000-000000000002',
    1,
    '97200000-0000-0000-0000-000000000003',
    '97200000-0000-0000-0000-000000000004',
    0,
    0,
    null,
    now()
  );

insert into bracket_slots (event_id, round, slot_index, player_id, status)
values ('97400000-0000-0000-0000-000000000001', 1, 1, '97200000-0000-0000-0000-000000000001', 'occupied');

insert into bracket_slots (event_id, round, slot_index, source_match_id, status)
values ('97400000-0000-0000-0000-000000000001', 2, 1, '97500000-0000-0000-0000-000000000001', 'advanced');

do $$
declare
  succeeded boolean;
begin
  begin
    insert into bracket_slots (event_id, round, slot_index, player_id, status)
    values ('97400000-0000-0000-0000-000000000001', 1, 1, '97200000-0000-0000-0000-000000000002', 'occupied');
    succeeded := true;
  exception when others then
    succeeded := false;
  end;

  if succeeded then
    raise exception 'expected duplicate bracket slot insert to fail';
  end if;
end;
$$;

do $$
declare
  succeeded boolean;
begin
  begin
    insert into bracket_slots (event_id, round, slot_index, player_id, status)
    values ('97400000-0000-0000-0000-000000000001', 1, 2, '97200000-0000-0000-0000-000000000003', 'occupied');
    succeeded := true;
  exception when others then
    succeeded := false;
  end;

  if succeeded then
    raise exception 'expected cross-organization bracket slot player insert to fail';
  end if;
end;
$$;

do $$
declare
  succeeded boolean;
begin
  begin
    insert into bracket_slots (event_id, round, slot_index, source_match_id, status)
    values ('97400000-0000-0000-0000-000000000001', 2, 2, '97500000-0000-0000-0000-000000000002', 'advanced');
    succeeded := true;
  exception when others then
    succeeded := false;
  end;

  if succeeded then
    raise exception 'expected cross-event bracket slot source match insert to fail';
  end if;
end;
$$;

do $$
declare
  viewer_id uuid := gen_random_uuid();
  editor_id uuid := gen_random_uuid();
  viewer_insert_blocked boolean := false;
  editor_slot_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values
    (
      viewer_id,
      'authenticated',
      'authenticated',
      'stage51-viewer@example.com',
      '',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    ),
    (
      editor_id,
      'authenticated',
      'authenticated',
      'stage51-editor@example.com',
      '',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    );

  insert into organization_members (organization_id, user_id, role)
  values
    ('97000000-0000-0000-0000-000000000001', viewer_id, 'viewer'),
    ('97000000-0000-0000-0000-000000000001', editor_id, 'editor');

  perform set_config('request.jwt.claim.sub', viewer_id::text, true);
  execute 'set local role authenticated';

  begin
    insert into bracket_slots (event_id, round, slot_index, player_id, status)
    values ('97400000-0000-0000-0000-000000000001', 1, 3, '97200000-0000-0000-0000-000000000002', 'bye');
  exception
    when insufficient_privilege or with_check_option_violation then
      viewer_insert_blocked := true;
  end;

  if not viewer_insert_blocked then
    raise exception 'viewer was able to insert bracket_slots';
  end if;

  execute 'reset role';
  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';

  insert into bracket_slots (id, event_id, round, slot_index, player_id, status)
  values (editor_slot_id, '97400000-0000-0000-0000-000000000001', 1, 3, '97200000-0000-0000-0000-000000000002', 'bye');

  update bracket_slots
  set status = 'occupied'
  where id = editor_slot_id;

  delete from bracket_slots
  where id = editor_slot_id;

  execute 'reset role';
end;
$$;

rollback;
