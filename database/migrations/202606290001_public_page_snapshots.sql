-- Stage 13: allow one public page to publish one latest snapshot per weapon.

create table if not exists public_page_snapshots (
  id uuid primary key default gen_random_uuid(),
  public_page_id uuid not null references public_pages(id) on delete cascade,
  weapon_type_id uuid not null references weapon_types(id) on delete cascade,
  snapshot_id uuid not null references ranking_snapshots(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (public_page_id, weapon_type_id)
);

create index if not exists idx_public_page_snapshots_page on public_page_snapshots(public_page_id);
create index if not exists idx_public_page_snapshots_snapshot on public_page_snapshots(snapshot_id);
