# 阶段 1：数据库与基础数据模型

## 范围

- 将多武器类型积分池固化为 Supabase/PostgreSQL schema。
- 定义前端、API、Ranking Engine 后续共用的 TypeScript 领域模型。
- 提供本地和 Supabase 初始化可复用的基础种子数据。

## 数据模型

核心表：

- `organizations`：组织/俱乐部。
- `weapon_types`：武器类型，区分长剑、军刀、迅捷剑等积分池。
- `players`：选手基础信息。
- `player_weapon_ratings`：选手在不同武器类型下的独立积分、RD、sigma 和战绩。
- `tournaments`：赛事。
- `tournament_events`：赛事下的比赛项目，每个项目绑定一个武器类型。
- `matches`：比赛记录，按项目和武器类型归属。
- `ranking_snapshots`：排名计算快照，按赛事和武器类型区分。
- `ranking_snapshot_items`：排名快照明细。
- `public_pages`：公开榜单配置。

## 文件产出

- `database/migrations/202606240001_initial_schema.sql`
- `database/seeds/202606240001_seed_core_data.sql`
- `lib/domain/types.ts`
- `lib/database/types.ts`

## 执行方式

Supabase SQL Editor 或 CLI 可按顺序执行：

```bash
# 伪命令示例，后续接入 Supabase CLI 后替换为真实项目命令
psql "$DATABASE_URL" -f database/migrations/202606240001_initial_schema.sql
psql "$DATABASE_URL" -f database/seeds/202606240001_seed_core_data.sql
```

## 当前限制

- 阶段 1 只生成 schema 和类型，不连接真实 Supabase 项目。
- 暂不实现 API Repository。
- 暂不把首页 Mock 数据替换为数据库查询。
