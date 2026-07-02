-- Stage: allow authenticated members to manage organization-level ranking snapshots.

drop policy if exists ranking_snapshots_member_select on ranking_snapshots;
drop policy if exists ranking_snapshots_member_insert on ranking_snapshots;
drop policy if exists ranking_snapshots_member_update on ranking_snapshots;
drop policy if exists ranking_snapshots_member_delete on ranking_snapshots;

create policy ranking_snapshots_member_select
on ranking_snapshots for select
to authenticated
using (
  exists (
    select 1
    from weapon_types
    left join tournaments on tournaments.id = ranking_snapshots.tournament_id
    where weapon_types.id = ranking_snapshots.weapon_type_id
      and current_user_is_org_member(coalesce(tournaments.organization_id, weapon_types.organization_id))
  )
);

create policy ranking_snapshots_member_insert
on ranking_snapshots for insert
to authenticated
with check (
  exists (
    select 1
    from weapon_types
    left join tournaments on tournaments.id = ranking_snapshots.tournament_id
    where weapon_types.id = ranking_snapshots.weapon_type_id
      and current_user_can_write_org(coalesce(tournaments.organization_id, weapon_types.organization_id))
  )
);

create policy ranking_snapshots_member_update
on ranking_snapshots for update
to authenticated
using (
  exists (
    select 1
    from weapon_types
    left join tournaments on tournaments.id = ranking_snapshots.tournament_id
    where weapon_types.id = ranking_snapshots.weapon_type_id
      and current_user_can_write_org(coalesce(tournaments.organization_id, weapon_types.organization_id))
  )
)
with check (
  exists (
    select 1
    from weapon_types
    left join tournaments on tournaments.id = ranking_snapshots.tournament_id
    where weapon_types.id = ranking_snapshots.weapon_type_id
      and current_user_can_write_org(coalesce(tournaments.organization_id, weapon_types.organization_id))
  )
);

create policy ranking_snapshots_member_delete
on ranking_snapshots for delete
to authenticated
using (
  exists (
    select 1
    from weapon_types
    left join tournaments on tournaments.id = ranking_snapshots.tournament_id
    where weapon_types.id = ranking_snapshots.weapon_type_id
      and current_user_can_write_org(coalesce(tournaments.organization_id, weapon_types.organization_id))
  )
);

drop policy if exists ranking_snapshot_items_member_select on ranking_snapshot_items;
drop policy if exists ranking_snapshot_items_member_insert on ranking_snapshot_items;
drop policy if exists ranking_snapshot_items_member_update on ranking_snapshot_items;
drop policy if exists ranking_snapshot_items_member_delete on ranking_snapshot_items;

create policy ranking_snapshot_items_member_select
on ranking_snapshot_items for select
to authenticated
using (
  exists (
    select 1
    from ranking_snapshots
    join weapon_types on weapon_types.id = ranking_snapshots.weapon_type_id
    left join tournaments on tournaments.id = ranking_snapshots.tournament_id
    where ranking_snapshots.id = ranking_snapshot_items.snapshot_id
      and current_user_is_org_member(coalesce(tournaments.organization_id, weapon_types.organization_id))
  )
);

create policy ranking_snapshot_items_member_insert
on ranking_snapshot_items for insert
to authenticated
with check (
  exists (
    select 1
    from ranking_snapshots
    join weapon_types on weapon_types.id = ranking_snapshots.weapon_type_id
    left join tournaments on tournaments.id = ranking_snapshots.tournament_id
    where ranking_snapshots.id = ranking_snapshot_items.snapshot_id
      and current_user_can_write_org(coalesce(tournaments.organization_id, weapon_types.organization_id))
  )
);

create policy ranking_snapshot_items_member_update
on ranking_snapshot_items for update
to authenticated
using (
  exists (
    select 1
    from ranking_snapshots
    join weapon_types on weapon_types.id = ranking_snapshots.weapon_type_id
    left join tournaments on tournaments.id = ranking_snapshots.tournament_id
    where ranking_snapshots.id = ranking_snapshot_items.snapshot_id
      and current_user_can_write_org(coalesce(tournaments.organization_id, weapon_types.organization_id))
  )
)
with check (
  exists (
    select 1
    from ranking_snapshots
    join weapon_types on weapon_types.id = ranking_snapshots.weapon_type_id
    left join tournaments on tournaments.id = ranking_snapshots.tournament_id
    where ranking_snapshots.id = ranking_snapshot_items.snapshot_id
      and current_user_can_write_org(coalesce(tournaments.organization_id, weapon_types.organization_id))
  )
);

create policy ranking_snapshot_items_member_delete
on ranking_snapshot_items for delete
to authenticated
using (
  exists (
    select 1
    from ranking_snapshots
    join weapon_types on weapon_types.id = ranking_snapshots.weapon_type_id
    left join tournaments on tournaments.id = ranking_snapshots.tournament_id
    where ranking_snapshots.id = ranking_snapshot_items.snapshot_id
      and current_user_can_write_org(coalesce(tournaments.organization_id, weapon_types.organization_id))
  )
);
