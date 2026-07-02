-- Stage: verify organization-level ranking snapshot RLS policies.

begin;

do $$
declare
  missing_name text;
begin
  select expected.name
    into missing_name
  from (
    values
      ('ranking_snapshots_member_select'),
      ('ranking_snapshots_member_insert'),
      ('ranking_snapshots_member_update'),
      ('ranking_snapshots_member_delete'),
      ('ranking_snapshot_items_member_select'),
      ('ranking_snapshot_items_member_insert'),
      ('ranking_snapshot_items_member_update'),
      ('ranking_snapshot_items_member_delete')
  ) as expected(name)
  where not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and policyname = expected.name
  )
  limit 1;

  if missing_name is not null then
    raise exception 'missing organization ranking snapshot RLS policy: %', missing_name;
  end if;
end;
$$;

do $$
declare
  org_a uuid := '9a000000-0000-0000-0000-000000000001';
  org_b uuid := '9a000000-0000-0000-0000-000000000002';
  weapon_a uuid := '9a100000-0000-0000-0000-000000000001';
  weapon_b uuid := '9a100000-0000-0000-0000-000000000002';
  player_a uuid := '9a200000-0000-0000-0000-000000000001';
  player_b uuid := '9a200000-0000-0000-0000-000000000002';
  viewer_id uuid := '9a300000-0000-0000-0000-000000000001';
  editor_id uuid := '9a300000-0000-0000-0000-000000000002';
  snapshot_id uuid := '9a400000-0000-0000-0000-000000000001';
  viewer_insert_blocked boolean := false;
  cross_org_item_blocked boolean := false;
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
      'org-ranking-viewer@example.com',
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
      'org-ranking-editor@example.com',
      '',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    );

  insert into organizations (id, name, slug)
  values
    (org_a, 'Org Ranking RLS A', 'org-ranking-rls-a'),
    (org_b, 'Org Ranking RLS B', 'org-ranking-rls-b');

  insert into organization_members (organization_id, user_id, role)
  values
    (org_a, viewer_id, 'viewer'),
    (org_a, editor_id, 'editor');

  insert into weapon_types (id, organization_id, name, slug, enabled, sort_order)
  values
    (weapon_a, org_a, 'Org Ranking Weapon A', 'org-ranking-weapon-a', true, 1),
    (weapon_b, org_b, 'Org Ranking Weapon B', 'org-ranking-weapon-b', true, 1);

  insert into players (id, organization_id, name, club)
  values
    (player_a, org_a, 'Org Ranking Player A', 'Validation Club A'),
    (player_b, org_b, 'Org Ranking Player B', 'Validation Club B');

  perform set_config('request.jwt.claim.sub', viewer_id::text, true);
  execute 'set local role authenticated';

  begin
    insert into ranking_snapshots (
      tournament_id,
      weapon_type_id,
      algorithm,
      generated_at,
      source_hash
    )
    values (
      null,
      weapon_a,
      'hybrid',
      now(),
      'viewer-org-ranking-snapshot'
    );
  exception
    when insufficient_privilege or with_check_option_violation then
      viewer_insert_blocked := true;
  end;

  if not viewer_insert_blocked then
    raise exception 'viewer was able to insert organization-level ranking snapshot';
  end if;

  execute 'reset role';
  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';

  insert into ranking_snapshots (
    id,
    tournament_id,
    weapon_type_id,
    algorithm,
    generated_at,
    source_hash
  )
  values (
    snapshot_id,
    null,
    weapon_a,
    'hybrid',
    now(),
    'editor-org-ranking-snapshot'
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
    snapshot_id,
    player_a,
    1,
    1500,
    0,
    0,
    0,
    0
  );

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
      snapshot_id,
      player_b,
      2,
      1500,
      0,
      0,
      0,
      0
    );
  exception
    when insufficient_privilege or check_violation or raise_exception then
      cross_org_item_blocked := true;
  end;

  if not cross_org_item_blocked then
    raise exception 'cross-organization organization-level ranking snapshot item insert succeeded';
  end if;

  execute 'reset role';
end;
$$;

rollback;
