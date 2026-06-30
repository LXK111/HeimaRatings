-- Stage 24: restrict authenticated management writes to organization admins and editors.

create or replace function current_user_can_write_org(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and role in ('admin', 'editor')
  );
$$;

revoke execute on function current_user_is_org_member(uuid) from public;
revoke execute on function current_user_is_org_admin(uuid) from public;
revoke execute on function current_user_can_write_org(uuid) from public;
grant execute on function current_user_is_org_member(uuid) to authenticated;
grant execute on function current_user_is_org_admin(uuid) to authenticated;
grant execute on function current_user_can_write_org(uuid) to authenticated;

drop policy if exists organizations_member_select on organizations;
create policy organizations_member_select
on organizations for select
to authenticated
using (current_user_is_org_member(id));

drop policy if exists organization_members_self_select on organization_members;
create policy organization_members_self_select
on organization_members for select
to authenticated
using (user_id = auth.uid() or current_user_is_org_admin(organization_id));

drop policy if exists organization_members_admin_manage on organization_members;
create policy organization_members_admin_manage
on organization_members for all
to authenticated
using (current_user_is_org_admin(organization_id))
with check (current_user_is_org_admin(organization_id));

drop policy if exists weapon_types_member_manage on weapon_types;
drop policy if exists weapon_types_member_select on weapon_types;
drop policy if exists weapon_types_member_insert on weapon_types;
drop policy if exists weapon_types_member_update on weapon_types;
drop policy if exists weapon_types_member_delete on weapon_types;
create policy weapon_types_member_select
on weapon_types for select
to authenticated
using (current_user_is_org_member(organization_id));
create policy weapon_types_member_insert
on weapon_types for insert
to authenticated
with check (current_user_can_write_org(organization_id));
create policy weapon_types_member_update
on weapon_types for update
to authenticated
using (current_user_can_write_org(organization_id))
with check (current_user_can_write_org(organization_id));
create policy weapon_types_member_delete
on weapon_types for delete
to authenticated
using (current_user_can_write_org(organization_id));

drop policy if exists players_member_manage on players;
drop policy if exists players_member_select on players;
drop policy if exists players_member_insert on players;
drop policy if exists players_member_update on players;
drop policy if exists players_member_delete on players;
create policy players_member_select
on players for select
to authenticated
using (current_user_is_org_member(organization_id));
create policy players_member_insert
on players for insert
to authenticated
with check (current_user_can_write_org(organization_id));
create policy players_member_update
on players for update
to authenticated
using (current_user_can_write_org(organization_id))
with check (current_user_can_write_org(organization_id));
create policy players_member_delete
on players for delete
to authenticated
using (current_user_can_write_org(organization_id));

drop policy if exists player_weapon_ratings_member_manage on player_weapon_ratings;
drop policy if exists player_weapon_ratings_member_select on player_weapon_ratings;
drop policy if exists player_weapon_ratings_member_insert on player_weapon_ratings;
drop policy if exists player_weapon_ratings_member_update on player_weapon_ratings;
drop policy if exists player_weapon_ratings_member_delete on player_weapon_ratings;
create policy player_weapon_ratings_member_select
on player_weapon_ratings for select
to authenticated
using (
  exists (
    select 1
    from players
    where players.id = player_weapon_ratings.player_id
      and current_user_is_org_member(players.organization_id)
  )
);
create policy player_weapon_ratings_member_insert
on player_weapon_ratings for insert
to authenticated
with check (
  exists (
    select 1
    from players
    where players.id = player_weapon_ratings.player_id
      and current_user_can_write_org(players.organization_id)
  )
);
create policy player_weapon_ratings_member_update
on player_weapon_ratings for update
to authenticated
using (
  exists (
    select 1
    from players
    where players.id = player_weapon_ratings.player_id
      and current_user_can_write_org(players.organization_id)
  )
)
with check (
  exists (
    select 1
    from players
    where players.id = player_weapon_ratings.player_id
      and current_user_can_write_org(players.organization_id)
  )
);
create policy player_weapon_ratings_member_delete
on player_weapon_ratings for delete
to authenticated
using (
  exists (
    select 1
    from players
    where players.id = player_weapon_ratings.player_id
      and current_user_can_write_org(players.organization_id)
  )
);

drop policy if exists tournaments_member_manage on tournaments;
drop policy if exists tournaments_member_select on tournaments;
drop policy if exists tournaments_member_insert on tournaments;
drop policy if exists tournaments_member_update on tournaments;
drop policy if exists tournaments_member_delete on tournaments;
create policy tournaments_member_select
on tournaments for select
to authenticated
using (current_user_is_org_member(organization_id));
create policy tournaments_member_insert
on tournaments for insert
to authenticated
with check (current_user_can_write_org(organization_id));
create policy tournaments_member_update
on tournaments for update
to authenticated
using (current_user_can_write_org(organization_id))
with check (current_user_can_write_org(organization_id));
create policy tournaments_member_delete
on tournaments for delete
to authenticated
using (current_user_can_write_org(organization_id));

drop policy if exists tournament_events_member_manage on tournament_events;
drop policy if exists tournament_events_member_select on tournament_events;
drop policy if exists tournament_events_member_insert on tournament_events;
drop policy if exists tournament_events_member_update on tournament_events;
drop policy if exists tournament_events_member_delete on tournament_events;
create policy tournament_events_member_select
on tournament_events for select
to authenticated
using (
  exists (
    select 1
    from tournaments
    where tournaments.id = tournament_events.tournament_id
      and current_user_is_org_member(tournaments.organization_id)
  )
);
create policy tournament_events_member_insert
on tournament_events for insert
to authenticated
with check (
  exists (
    select 1
    from tournaments
    where tournaments.id = tournament_events.tournament_id
      and current_user_can_write_org(tournaments.organization_id)
  )
);
create policy tournament_events_member_update
on tournament_events for update
to authenticated
using (
  exists (
    select 1
    from tournaments
    where tournaments.id = tournament_events.tournament_id
      and current_user_can_write_org(tournaments.organization_id)
  )
)
with check (
  exists (
    select 1
    from tournaments
    where tournaments.id = tournament_events.tournament_id
      and current_user_can_write_org(tournaments.organization_id)
  )
);
create policy tournament_events_member_delete
on tournament_events for delete
to authenticated
using (
  exists (
    select 1
    from tournaments
    where tournaments.id = tournament_events.tournament_id
      and current_user_can_write_org(tournaments.organization_id)
  )
);

drop policy if exists matches_member_manage on matches;
drop policy if exists matches_member_select on matches;
drop policy if exists matches_member_insert on matches;
drop policy if exists matches_member_update on matches;
drop policy if exists matches_member_delete on matches;
create policy matches_member_select
on matches for select
to authenticated
using (
  exists (
    select 1
    from tournaments
    where tournaments.id = matches.tournament_id
      and current_user_is_org_member(tournaments.organization_id)
  )
);
create policy matches_member_insert
on matches for insert
to authenticated
with check (
  exists (
    select 1
    from tournaments
    where tournaments.id = matches.tournament_id
      and current_user_can_write_org(tournaments.organization_id)
  )
);
create policy matches_member_update
on matches for update
to authenticated
using (
  exists (
    select 1
    from tournaments
    where tournaments.id = matches.tournament_id
      and current_user_can_write_org(tournaments.organization_id)
  )
)
with check (
  exists (
    select 1
    from tournaments
    where tournaments.id = matches.tournament_id
      and current_user_can_write_org(tournaments.organization_id)
  )
);
create policy matches_member_delete
on matches for delete
to authenticated
using (
  exists (
    select 1
    from tournaments
    where tournaments.id = matches.tournament_id
      and current_user_can_write_org(tournaments.organization_id)
  )
);

drop policy if exists ranking_snapshots_member_manage on ranking_snapshots;
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
    from tournaments
    where tournaments.id = ranking_snapshots.tournament_id
      and current_user_is_org_member(tournaments.organization_id)
  )
);
create policy ranking_snapshots_member_insert
on ranking_snapshots for insert
to authenticated
with check (
  exists (
    select 1
    from tournaments
    where tournaments.id = ranking_snapshots.tournament_id
      and current_user_can_write_org(tournaments.organization_id)
  )
);
create policy ranking_snapshots_member_update
on ranking_snapshots for update
to authenticated
using (
  exists (
    select 1
    from tournaments
    where tournaments.id = ranking_snapshots.tournament_id
      and current_user_can_write_org(tournaments.organization_id)
  )
)
with check (
  exists (
    select 1
    from tournaments
    where tournaments.id = ranking_snapshots.tournament_id
      and current_user_can_write_org(tournaments.organization_id)
  )
);
create policy ranking_snapshots_member_delete
on ranking_snapshots for delete
to authenticated
using (
  exists (
    select 1
    from tournaments
    where tournaments.id = ranking_snapshots.tournament_id
      and current_user_can_write_org(tournaments.organization_id)
  )
);

drop policy if exists ranking_snapshot_items_member_manage on ranking_snapshot_items;
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
    join tournaments on tournaments.id = ranking_snapshots.tournament_id
    where ranking_snapshots.id = ranking_snapshot_items.snapshot_id
      and current_user_is_org_member(tournaments.organization_id)
  )
);
create policy ranking_snapshot_items_member_insert
on ranking_snapshot_items for insert
to authenticated
with check (
  exists (
    select 1
    from ranking_snapshots
    join tournaments on tournaments.id = ranking_snapshots.tournament_id
    where ranking_snapshots.id = ranking_snapshot_items.snapshot_id
      and current_user_can_write_org(tournaments.organization_id)
  )
);
create policy ranking_snapshot_items_member_update
on ranking_snapshot_items for update
to authenticated
using (
  exists (
    select 1
    from ranking_snapshots
    join tournaments on tournaments.id = ranking_snapshots.tournament_id
    where ranking_snapshots.id = ranking_snapshot_items.snapshot_id
      and current_user_can_write_org(tournaments.organization_id)
  )
)
with check (
  exists (
    select 1
    from ranking_snapshots
    join tournaments on tournaments.id = ranking_snapshots.tournament_id
    where ranking_snapshots.id = ranking_snapshot_items.snapshot_id
      and current_user_can_write_org(tournaments.organization_id)
  )
);
create policy ranking_snapshot_items_member_delete
on ranking_snapshot_items for delete
to authenticated
using (
  exists (
    select 1
    from ranking_snapshots
    join tournaments on tournaments.id = ranking_snapshots.tournament_id
    where ranking_snapshots.id = ranking_snapshot_items.snapshot_id
      and current_user_can_write_org(tournaments.organization_id)
  )
);

drop policy if exists public_pages_member_manage on public_pages;
drop policy if exists public_pages_member_select on public_pages;
drop policy if exists public_pages_member_insert on public_pages;
drop policy if exists public_pages_member_update on public_pages;
drop policy if exists public_pages_member_delete on public_pages;
create policy public_pages_member_select
on public_pages for select
to authenticated
using (current_user_is_org_member(organization_id));
create policy public_pages_member_insert
on public_pages for insert
to authenticated
with check (current_user_can_write_org(organization_id));
create policy public_pages_member_update
on public_pages for update
to authenticated
using (current_user_can_write_org(organization_id))
with check (current_user_can_write_org(organization_id));
create policy public_pages_member_delete
on public_pages for delete
to authenticated
using (current_user_can_write_org(organization_id));

drop policy if exists public_pages_enabled_select on public_pages;
create policy public_pages_enabled_select
on public_pages for select
to anon, authenticated
using (enabled = true);

drop policy if exists public_page_snapshots_member_manage on public_page_snapshots;
drop policy if exists public_page_snapshots_member_select on public_page_snapshots;
drop policy if exists public_page_snapshots_member_insert on public_page_snapshots;
drop policy if exists public_page_snapshots_member_update on public_page_snapshots;
drop policy if exists public_page_snapshots_member_delete on public_page_snapshots;
create policy public_page_snapshots_member_select
on public_page_snapshots for select
to authenticated
using (
  exists (
    select 1
    from public_pages
    where public_pages.id = public_page_snapshots.public_page_id
      and current_user_is_org_member(public_pages.organization_id)
  )
);
create policy public_page_snapshots_member_insert
on public_page_snapshots for insert
to authenticated
with check (
  exists (
    select 1
    from public_pages
    where public_pages.id = public_page_snapshots.public_page_id
      and current_user_can_write_org(public_pages.organization_id)
  )
);
create policy public_page_snapshots_member_update
on public_page_snapshots for update
to authenticated
using (
  exists (
    select 1
    from public_pages
    where public_pages.id = public_page_snapshots.public_page_id
      and current_user_can_write_org(public_pages.organization_id)
  )
)
with check (
  exists (
    select 1
    from public_pages
    where public_pages.id = public_page_snapshots.public_page_id
      and current_user_can_write_org(public_pages.organization_id)
  )
);
create policy public_page_snapshots_member_delete
on public_page_snapshots for delete
to authenticated
using (
  exists (
    select 1
    from public_pages
    where public_pages.id = public_page_snapshots.public_page_id
      and current_user_can_write_org(public_pages.organization_id)
  )
);

drop policy if exists public_page_snapshots_enabled_select on public_page_snapshots;
create policy public_page_snapshots_enabled_select
on public_page_snapshots for select
to anon, authenticated
using (
  exists (
    select 1
    from public_pages
    where public_pages.id = public_page_snapshots.public_page_id
      and public_pages.enabled = true
  )
);
