-- Stage 18: verify organization membership and RLS foundation.

begin;

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'organization_members'
  ) then
    raise exception 'missing organization_members table';
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
      ('current_user_is_org_member'),
      ('current_user_is_org_admin')
  ) as expected(name)
  where not exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = expected.name
  )
  limit 1;

  if missing_name is not null then
    raise exception 'missing RLS helper function: %', missing_name;
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
      ('organizations'),
      ('organization_members'),
      ('weapon_types'),
      ('players'),
      ('player_weapon_ratings'),
      ('tournaments'),
      ('tournament_events'),
      ('matches'),
      ('ranking_snapshots'),
      ('ranking_snapshot_items'),
      ('public_pages'),
      ('public_page_snapshots')
  ) as expected(name)
  where not exists (
    select 1
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = expected.name
      and pg_class.relrowsecurity = true
  )
  limit 1;

  if missing_name is not null then
    raise exception 'RLS is not enabled on table: %', missing_name;
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
      ('organizations_member_select'),
      ('organization_members_self_select'),
      ('organization_members_admin_manage'),
      ('weapon_types_member_manage'),
      ('players_member_manage'),
      ('player_weapon_ratings_member_manage'),
      ('tournaments_member_manage'),
      ('tournament_events_member_manage'),
      ('matches_member_manage'),
      ('ranking_snapshots_member_manage'),
      ('ranking_snapshot_items_member_manage'),
      ('public_pages_member_manage'),
      ('public_pages_enabled_select'),
      ('public_page_snapshots_member_manage'),
      ('public_page_snapshots_enabled_select')
  ) as expected(name)
  where not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and policyname = expected.name
  )
  limit 1;

  if missing_name is not null then
    raise exception 'missing RLS policy: %', missing_name;
  end if;
end;
$$;

rollback;
