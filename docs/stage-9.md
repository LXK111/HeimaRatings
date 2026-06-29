# 阶段 9：Supabase 真库联调验证

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-29 | TRAE | 创建阶段 9 真库联调验证文档 |

## 范围

- 在 Supabase 真库执行 migration 和 seed。
- 配置 `.env.local` 切换为 `HEIMA_RATINGS_DATA_SOURCE=supabase`。
- 验证基础读取 API：武器、选手、赛事、赛事项目、比赛列表。
- 验证比赛写入 API：写入 `matches` 表并回读。
- 验证 Ranking Engine 计算：从真库构造输入，调用 Python runner 返回排名。
- 公开榜单 API 返回 404 是预期内（`public_pages` 表未灌数据，留到后续阶段）。

## 执行记录

### 环境准备

- `.env.local` 已配置：
  - `HEIMA_RATINGS_DATA_SOURCE=supabase`
  - `NEXT_PUBLIC_SUPABASE_URL=https://ndpsipkvkftkrmxryhto.supabase.co`
  - `SUPABASE_SERVICE_ROLE_KEY=<已配置>`
- 真库已执行 `database/migrations/202606240001_initial_schema.sql`。
- 真库已执行 `database/seeds/202606240001_seed_core_data.sql`。

### 验证结果

- `GET /api/weapons`：通过，返回 4 种武器（长剑、军刀、迅捷剑、匕首）。
- `GET /api/players`：通过，返回 3 名选手（林澈、周衡、许岚）。
- `GET /api/tournaments`：通过，返回 1 个赛事（HEMA 春季积分赛）。
- `GET /api/tournaments/demo/events`：通过，返回 2 个赛事项目。
- `GET /api/tournaments/demo/matches`：通过，初始 0 场。
- `POST /api/tournaments/demo/matches`：通过，林澈 5-3 周衡，写入 `matches` 表。
- `POST /api/rankings/calculate`（hybrid + 长剑）：通过，3 人排名正常返回。
- `GET /api/public/rankings/demo`：404，预期内（`public_pages` 未 seed）。

### 结论

真库联调核心读写链路已闭环：
- Supabase 连接 ✅
- 基础读取 ✅
- 比赛写入 ✅
- Ranking Engine 从真库取数计算 ✅

## 遗留事项

- `public_pages` 表 seed 未补，公开榜单 API 返回 404（阶段 10 处理）。
- `ranking_snapshots` 写入未实现（阶段 10 处理）。
- 公开榜单读取真实快照未实现（阶段 10 处理）。
