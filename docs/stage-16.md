# 阶段 16：数据库级多组织隔离约束

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-29 | Codex | 创建阶段 16 执行记录，记录数据库级多组织隔离约束 |
| v0.2 | 2026-06-29 | Codex | 补充真库 DDL 已手动执行完成 |

## 范围

- 将 `public_pages.page_id` 从全局唯一改为组织内唯一。
- 为组织隔离常用查询补充复合索引。
- 增加数据库 trigger，阻止跨组织错绑写入。
- 更新 seed，使公开页 upsert 使用 `organization_id + page_id`。

## 非目标

- 不开启 Supabase RLS。
- 不接入登录、成员、角色或组织切换。
- 不把所有表都冗余写入 `organization_id`。
- 不移除 `public_pages.snapshot_id` 兼容字段。

## 实现记录

- 新增 `database/migrations/202606290002_organization_integrity_constraints.sql`。
- `public_pages` 删除旧的全局 `page_id` 唯一约束，增加 `unique (organization_id, page_id)`。
- 新增索引：
  - `tournaments(organization_id, created_at desc)`
  - `public_pages(organization_id, tournament_id)`
  - `matches(tournament_id, event_id, weapon_type_id, round)`
  - `ranking_snapshots(tournament_id, weapon_type_id, created_at desc)`
- 新增 trigger 校验：
  - `player_weapon_ratings`：选手和武器必须属于同一组织。
  - `tournament_events`：赛事和武器必须属于同一组织。
  - `matches`：赛事、项目、武器和选手必须在同一组织，且项目必须属于同一赛事和武器。
  - `ranking_snapshots`：赛事、武器和项目必须一致。
  - `ranking_snapshot_items`：选手必须与快照所属赛事同组织。
  - `public_pages`：公开页组织必须匹配赛事、默认武器和兼容快照。
  - `public_page_snapshots`：公开页、武器和快照必须同组织，且映射武器必须等于快照武器。
- 更新初始 schema 的 `public_pages` 定义，保证新库直接具备组织内唯一约束。
- 更新 seed 的公开页 upsert 冲突目标为 `(organization_id, page_id)`。

## 当前限制

- 这是数据库一致性约束，不是权限系统。
- 读权限仍由 Repository 和未来 RLS 控制。
- 触发器只覆盖当前 MVP 表；后续新增签表、淘汰晋级、报名表时需要同步补充组织归属校验。

## 验证记录

- `git diff --check`：通过，无空白格式问题。
- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- 真库 DDL 执行：已由用户在 Supabase 真库手动执行 `database/migrations/202606290002_organization_integrity_constraints.sql`。
