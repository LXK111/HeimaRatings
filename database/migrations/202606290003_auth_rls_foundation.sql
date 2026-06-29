-- Stage 18: add organization membership and RLS foundation.

create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id),
  check (role in ('admin', 'editor', 'viewer'))
);

create index if not exists idx_organization_members_user on organization_members(user_id);
create index if not exists idx_organization_members_org_role on organization_members(organization_id, role);

create or replace function current_user_is_org_member(target_organization_id uuid)
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
  );
$$;

create or replace function current_user_is_org_admin(target_organization_id uuid)
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
      and role = 'admin'
  );
$$;

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table weapon_types enable row level security;
alter table players enable row level security;
alter table player_weapon_ratings enable row level security;
alter table tournaments enable row level security;
alter table tournament_events enable row level security;
alter table matches enable row level security;
alter table ranking_snapshots enable row level security;
alter table ranking_snapshot_items enable row level security;
alter table public_pages enable row level security;
alter table public_page_snapshots enable row level security;

drop policy if exists organizations_member_select on organizations;
create policy organizations_member_select
on organizations for select
using (current_user_is_org_member(id));

drop policy if exists organization_members_self_select on organization_members;
create policy organization_members_self_select
on organization_members for select
using (user_id = auth.uid() or current_user_is_org_admin(organization_id));

drop policy if exists organization_members_admin_manage on organization_members;
create policy organization_members_admin_manage
on organization_members for all
using (current_user_is_org_admin(organization_id))
with check (current_user_is_org_admin(organization_id));

drop policy if exists weapon_types_member_manage on weapon_types;
create policy weapon_types_member_manage
on weapon_types for all
using (current_user_is_org_member(organization_id))
with check (current_user_is_org_member(organization_id));

drop policy if exists players_member_manage on players;
create policy players_member_manage
on players for all
using (current_user_is_org_member(organization_id))
with check (current_user_is_org_member(organization_id));

drop policy if exists player_weapon_ratings_member_manage on player_weapon_ratings;
create policy player_weapon_ratings_member_manage
on player_weapon_ratings for all
using (
  exists (
    select 1
    from players
    where players.id = player_weapon_ratings.player_id
      and current_user_is_org_member(players.organization_id)
  )
)
with check (
  exists (
    select 1
    from players
    where players.id = player_weapon_ratings.player_id
      and current_user_is_org_member(players.organization_id)
  )
);

drop policy if exists tournaments_member_manage on tournaments;
create policy tournaments_member_manage
on tournaments for all
using (current_user_is_org_member(organization_id))
with check (current_user_is_org_member(organization_id));

drop policy if exists tournament_events_member_manage on tournament_events;
create policy tournament_events_member_manage
on tournament_events for all
using (
  exists (
    select 1
    from tournaments
    where tournaments.id = tournament_events.tournament_id
      and current_user_is_org_member(tournaments.organization_id)
  )
)
with check (
  exists (
    select 1
    from tournaments
    where tournaments.id = tournament_events.tournament_id
      and current_user_is_org_member(tournaments.organization_id)
  )
);

drop policy if exists matches_member_manage on matches;
create policy matches_member_manage
on matches for all
using (
  exists (
    select 1
    from tournaments
    where tournaments.id = matches.tournament_id
      and current_user_is_org_member(tournaments.organization_id)
  )
)
with check (
  exists (
    select 1
    from tournaments
    where tournaments.id = matches.tournament_id
      and current_user_is_org_member(tournaments.organization_id)
  )
);

drop policy if exists ranking_snapshots_member_manage on ranking_snapshots;
create policy ranking_snapshots_member_manage
on ranking_snapshots for all
using (
  exists (
    select 1
    from tournaments
    where tournaments.id = ranking_snapshots.tournament_id
      and current_user_is_org_member(tournaments.organization_id)
  )
)
with check (
  exists (
    select 1
    from tournaments
    where tournaments.id = ranking_snapshots.tournament_id
      and current_user_is_org_member(tournaments.organization_id)
  )
);

drop policy if exists ranking_snapshot_items_member_manage on ranking_snapshot_items;
create policy ranking_snapshot_items_member_manage
on ranking_snapshot_items for all
using (
  exists (
    select 1
    from ranking_snapshots
    join tournaments on tournaments.id = ranking_snapshots.tournament_id
    where ranking_snapshots.id = ranking_snapshot_items.snapshot_id
      and current_user_is_org_member(tournaments.organization_id)
  )
)
with check (
  exists (
    select 1
    from ranking_snapshots
    join tournaments on tournaments.id = ranking_snapshots.tournament_id
    where ranking_snapshots.id = ranking_snapshot_items.snapshot_id
      and current_user_is_org_member(tournaments.organization_id)
  )
);

drop policy if exists public_pages_member_manage on public_pages;
create policy public_pages_member_manage
on public_pages for all
using (current_user_is_org_member(organization_id))
with check (current_user_is_org_member(organization_id));

drop policy if exists public_pages_enabled_select on public_pages;
create policy public_pages_enabled_select
on public_pages for select
using (enabled = true);

drop policy if exists public_page_snapshots_member_manage on public_page_snapshots;
create policy public_page_snapshots_member_manage
on public_page_snapshots for all
using (
  exists (
    select 1
    from public_pages
    where public_pages.id = public_page_snapshots.public_page_id
      and current_user_is_org_member(public_pages.organization_id)
  )
)
with check (
  exists (
    select 1
    from public_pages
    where public_pages.id = public_page_snapshots.public_page_id
      and current_user_is_org_member(public_pages.organization_id)
  )
);

drop policy if exists public_page_snapshots_enabled_select on public_page_snapshots;
create policy public_page_snapshots_enabled_select
on public_page_snapshots for select
using (
  exists (
    select 1
    from public_pages
    where public_pages.id = public_page_snapshots.public_page_id
      and public_pages.enabled = true
  )
);
