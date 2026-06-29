-- HEMA Ratings MVP seed data.
-- This seed uses fixed UUIDs so local demos remain deterministic.

insert into organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'HEMA Ratings Demo', 'hema-ratings-demo')
on conflict (slug) do nothing;

insert into weapon_types (id, organization_id, name, slug, enabled, sort_order)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '长剑', 'longsword', true, 10),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '军刀', 'sabre', true, 20),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '迅捷剑', 'rapier', true, 30),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '匕首', 'dagger', false, 40)
on conflict (organization_id, slug) do nothing;

insert into players (id, organization_id, name, club)
values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '林澈', '北境剑术会'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '周衡', '铜环训练场'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '许岚', '白鸦 HEMA')
on conflict (organization_id, name) do nothing;

insert into player_weapon_ratings (
  player_id,
  weapon_type_id,
  initial_rating,
  current_rating,
  rd,
  sigma,
  matches_count,
  wins_count,
  losses_count,
  draws_count
)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1700, 1812, 210, 0.18, 12, 10, 2, 0),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 1500, 1630, 260, 0.2, 7, 5, 2, 0),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 1680, 1764, 220, 0.18, 10, 7, 3, 0),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 1600, 1701, 240, 0.19, 8, 6, 2, 0),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 1600, 1698, 230, 0.19, 9, 6, 3, 0),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 1650, 1744, 215, 0.17, 11, 8, 3, 0)
on conflict (player_id, weapon_type_id) do nothing;

insert into tournaments (
  id,
  organization_id,
  name,
  format,
  status,
  default_algorithm,
  started_at
)
values (
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'HEMA 春季积分赛',
  'single_elimination',
  'active',
  'hybrid',
  '2026-06-24 09:00:00+00'
)
on conflict do nothing;

insert into tournament_events (id, tournament_id, weapon_type_id, name, format, status)
values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '长剑公开组', 'single_elimination', 'active'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '军刀公开组', 'single_elimination', 'active')
on conflict (tournament_id, name) do nothing;

insert into public_pages (
  organization_id,
  page_id,
  tournament_id,
  snapshot_id,
  default_weapon_type_id,
  title,
  theme,
  enabled
)
values (
  '00000000-0000-0000-0000-000000000001',
  'demo',
  '30000000-0000-0000-0000-000000000001',
  null,
  '10000000-0000-0000-0000-000000000001',
  'HEMA 春季积分赛公开榜单',
  'dark',
  true
)
on conflict (organization_id, page_id) do update
set
  tournament_id = excluded.tournament_id,
  default_weapon_type_id = excluded.default_weapon_type_id,
  title = excluded.title,
  theme = excluded.theme,
  enabled = excluded.enabled,
  updated_at = now();
