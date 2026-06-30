-- Stage 31: verify tournament event entries schema, scope trigger, and RLS policies.

begin;

do $$
declare
  missing_name text;
begin
  select expected.name
    into missing_name
  from (
    values
      ('tournament_event_entries'),
      ('trg_tournament_event_entries_scope'),
      ('idx_tournament_event_entries_event_seed'),
      ('idx_tournament_event_entries_player'),
      ('tournament_event_entries_member_select'),
      ('tournament_event_entries_member_insert'),
      ('tournament_event_entries_member_update'),
      ('tournament_event_entries_member_delete')
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
    raise exception 'missing stage 31 object: %', missing_name;
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
    and tablename = 'tournament_event_entries'
    and cmd in ('INSERT', 'UPDATE', 'DELETE')
    and (
      qual ilike '%current_user_is_org_member%'
      or with_check ilike '%current_user_is_org_member%'
      or coalesce(qual, '') not ilike '%current_user_can_write_org%'
         and coalesce(with_check, '') not ilike '%current_user_can_write_org%'
    )
  limit 1;

  if wrong_policy is not null then
    raise exception 'event entry write policy does not use current_user_can_write_org: %', wrong_policy;
  end if;
end;
$$;

insert into organizations (id, name, slug)
values
  ('98000000-0000-0000-0000-000000000001', 'Stage 31 Org A', 'stage-31-org-a'),
  ('98000000-0000-0000-0000-000000000002', 'Stage 31 Org B', 'stage-31-org-b');

insert into weapon_types (id, organization_id, name, slug, enabled, sort_order)
values
  ('98100000-0000-0000-0000-000000000001', '98000000-0000-0000-0000-000000000001', 'Stage 31 Longsword', 'stage-31-longsword', true, 10),
  ('98100000-0000-0000-0000-000000000002', '98000000-0000-0000-0000-000000000002', 'Stage 31 Sabre', 'stage-31-sabre', true, 20);

insert into players (id, organization_id, name, club)
values
  ('98200000-0000-0000-0000-000000000001', '98000000-0000-0000-0000-000000000001', 'Stage 31 Player A', 'Validation Club A'),
  ('98200000-0000-0000-0000-000000000003', '98000000-0000-0000-0000-000000000001', 'Stage 31 Player A2', 'Validation Club A'),
  ('98200000-0000-0000-0000-000000000002', '98000000-0000-0000-0000-000000000002', 'Stage 31 Player B', 'Validation Club B');

insert into tournaments (id, organization_id, name, format, status, default_algorithm)
values
  ('98300000-0000-0000-0000-000000000001', '98000000-0000-0000-0000-000000000001', 'Stage 31 Tournament A', 'single_elimination', 'active', 'hybrid'),
  ('98300000-0000-0000-0000-000000000002', '98000000-0000-0000-0000-000000000002', 'Stage 31 Tournament B', 'single_elimination', 'active', 'hybrid');

insert into tournament_events (id, tournament_id, weapon_type_id, name, format, status)
values
  ('98400000-0000-0000-0000-000000000001', '98300000-0000-0000-0000-000000000001', '98100000-0000-0000-0000-000000000001', 'Stage 31 Event A', 'single_elimination', 'active'),
  ('98400000-0000-0000-0000-000000000002', '98300000-0000-0000-0000-000000000002', '98100000-0000-0000-0000-000000000002', 'Stage 31 Event B', 'single_elimination', 'active');

insert into tournament_event_entries (event_id, player_id, seed)
values ('98400000-0000-0000-0000-000000000001', '98200000-0000-0000-0000-000000000001', 1);

do $$
declare
  succeeded boolean;
begin
  begin
    insert into tournament_event_entries (event_id, player_id, seed)
    values ('98400000-0000-0000-0000-000000000001', '98200000-0000-0000-0000-000000000002', 2);
    succeeded := true;
  exception when others then
    succeeded := false;
  end;

  if succeeded then
    raise exception 'expected cross-organization event entry insert to fail';
  end if;
end;
$$;

do $$
declare
  viewer_id uuid := gen_random_uuid();
  editor_id uuid := gen_random_uuid();
  viewer_insert_blocked boolean := false;
  editor_entry_id uuid := gen_random_uuid();
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
      'stage31-viewer@example.com',
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
      'stage31-editor@example.com',
      '',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    );

  insert into organization_members (organization_id, user_id, role)
  values
    ('98000000-0000-0000-0000-000000000001', viewer_id, 'viewer'),
    ('98000000-0000-0000-0000-000000000001', editor_id, 'editor');

  perform set_config('request.jwt.claim.sub', viewer_id::text, true);
  execute 'set local role authenticated';

  begin
    insert into tournament_event_entries (event_id, player_id, seed)
    values ('98400000-0000-0000-0000-000000000001', '98200000-0000-0000-0000-000000000003', 2);
  exception
    when insufficient_privilege or with_check_option_violation then
      viewer_insert_blocked := true;
  end;

  if not viewer_insert_blocked then
    raise exception 'viewer was able to insert tournament_event_entries';
  end if;

  execute 'reset role';
  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';

  insert into tournament_event_entries (id, event_id, player_id, seed)
  values (editor_entry_id, '98400000-0000-0000-0000-000000000001', '98200000-0000-0000-0000-000000000003', 3)
  on conflict (event_id, player_id)
  do update set seed = excluded.seed
  returning id into editor_entry_id;

  update tournament_event_entries
  set status = 'withdrawn'
  where id = editor_entry_id;

  delete from tournament_event_entries
  where id = editor_entry_id;

  execute 'reset role';
end;
$$;

rollback;
