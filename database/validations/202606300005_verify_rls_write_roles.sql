-- Stage 24: verify RLS write policies are role-aware.

begin;

do $$
declare
  legacy_name text;
begin
  select expected.name
    into legacy_name
  from (
    values
      ('weapon_types_member_manage'),
      ('players_member_manage'),
      ('player_weapon_ratings_member_manage'),
      ('tournaments_member_manage'),
      ('tournament_events_member_manage'),
      ('matches_member_manage'),
      ('ranking_snapshots_member_manage'),
      ('ranking_snapshot_items_member_manage'),
      ('public_pages_member_manage'),
      ('public_page_snapshots_member_manage')
  ) as expected(name)
  where exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and policyname = expected.name
  )
  limit 1;

  if legacy_name is not null then
    raise exception 'legacy member manage policy still exists: %', legacy_name;
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
      ('current_user_can_write_org'),
      ('weapon_types_member_select'),
      ('weapon_types_member_insert'),
      ('weapon_types_member_update'),
      ('weapon_types_member_delete'),
      ('matches_member_select'),
      ('matches_member_insert'),
      ('matches_member_update'),
      ('matches_member_delete'),
      ('public_pages_member_select'),
      ('public_pages_member_insert'),
      ('public_pages_member_update'),
      ('public_pages_member_delete')
  ) as expected(name)
  where not exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = expected.name
    union all
    select 1
    from pg_policies
    where schemaname = 'public'
      and policyname = expected.name
  )
  limit 1;

  if missing_name is not null then
    raise exception 'missing stage 24 RLS object: %', missing_name;
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
    and policyname ~ '_(insert|update|delete)$'
    and cmd in ('INSERT', 'UPDATE', 'DELETE')
    and (
      qual ilike '%current_user_is_org_member%'
      or with_check ilike '%current_user_is_org_member%'
      or coalesce(qual, '') not ilike '%current_user_can_write_org%'
         and coalesce(with_check, '') not ilike '%current_user_can_write_org%'
    )
  limit 1;

  if wrong_policy is not null then
    raise exception 'write policy does not use current_user_can_write_org: %', wrong_policy;
  end if;
end;
$$;

do $$
declare
  organization_id uuid := gen_random_uuid();
  viewer_id uuid := gen_random_uuid();
  editor_id uuid := gen_random_uuid();
  viewer_insert_blocked boolean := false;
  editor_weapon_id uuid := gen_random_uuid();
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
      'stage24-viewer@example.com',
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
      'stage24-editor@example.com',
      '',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    );

  insert into organizations (id, name, slug)
  values (organization_id, 'Stage 24 RLS Org', 'stage-24-rls-org');

  insert into organization_members (organization_id, user_id, role)
  values
    (organization_id, viewer_id, 'viewer'),
    (organization_id, editor_id, 'editor');

  perform set_config('request.jwt.claim.sub', viewer_id::text, true);
  execute 'set local role authenticated';

  begin
    insert into weapon_types (organization_id, name, slug, enabled, sort_order)
    values (organization_id, 'Viewer Blocked Weapon', 'viewer-blocked-weapon', true, 1);
  exception
    when insufficient_privilege or with_check_option_violation then
      viewer_insert_blocked := true;
  end;

  if not viewer_insert_blocked then
    raise exception 'viewer was able to insert weapon_types';
  end if;

  execute 'reset role';
  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';

  insert into weapon_types (id, organization_id, name, slug, enabled, sort_order)
  values (editor_weapon_id, organization_id, 'Editor Allowed Weapon', 'editor-allowed-weapon', true, 2);

  update weapon_types
  set name = 'Editor Updated Weapon'
  where id = editor_weapon_id;

  delete from weapon_types
  where id = editor_weapon_id;

  execute 'reset role';
end;
$$;

rollback;
