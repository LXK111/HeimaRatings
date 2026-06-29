# 阶段 10：排名快照发布闭环

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-29 | Codex | 创建阶段 10 执行记录，记录排名快照保存与公开页发布闭环 |
| v0.2 | 2026-06-29 | Codex | 补充 Supabase 真库发布快照验收结果 |

## 范围

- 实现 `SupabaseRepository.createRankingSnapshot()`，写入 `ranking_snapshots` 和 `ranking_snapshot_items`。
- 扩展 `/api/rankings/calculate`，支持显式传入 `persistSnapshot: true` 保存快照。
- 支持传入 `publishPageId`，在 Supabase 模式下 upsert `public_pages` 并指向最新快照。
- 补充 `public_pages` demo seed，使 Supabase 模式公开榜单 API 有稳定入口。
- 保持默认计算行为不变：未传 `persistSnapshot` 时只返回 Ranking Engine 计算结果，不写库。

## 接口用法

只计算，不保存：

```bash
curl -X POST http://localhost:3000/api/rankings/calculate \
  -H 'Content-Type: application/json' \
  -d '{"algorithm":"hybrid","weaponTypeId":"weapon-longsword","tournamentId":"demo"}'
```

计算、保存快照并发布到 demo 公开页：

```bash
curl -X POST http://localhost:3000/api/rankings/calculate \
  -H 'Content-Type: application/json' \
  -d '{"algorithm":"hybrid","weaponTypeId":"weapon-longsword","tournamentId":"demo","persistSnapshot":true,"publishPageId":"demo"}'
```

发布后读取：

```bash
curl http://localhost:3000/api/public/rankings/demo
```

## 数据流

1. API 收到 `persistSnapshot: true`。
2. 服务端通过 Repository 构造 Ranking Engine 输入，避免使用客户端 Mock ID 污染真库。
3. Ranking Engine 返回排名结果。
4. Repository 写入 `ranking_snapshots`。
5. Repository 批量写入 `ranking_snapshot_items`。
6. 如果传入 `publishPageId`，upsert `public_pages` 并把 `snapshot_id` 指向最新快照。
7. 公开榜单 API、公开页和嵌入页读取 `public_pages` 关联快照展示真实排名。

## 当前限制

- 比赛工作台还没有显式“发布榜单”按钮，阶段 10 先提供 API 级发布能力。
- Mock 模式下 `createRankingSnapshot()` 仍只返回非持久化占位快照。
- 当前公开页只指向一个最新快照；多武器同时发布需要后续扩展 `public_pages` 与快照选择模型。
- 尚未引入自动化接口测试，仍以本地 `check`、`build`、`verify` 和手动 API 验证为主。

## 验证记录

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- `npm run smoke` 覆盖新增 `persistSnapshot: true` 分支：通过，`ranking snapshot publish` 返回结果、快照和 `publishPageId`。

### Supabase 真库验收

- `GET /api/weapons`：通过，返回 4 种武器。
- `GET /api/tournaments`：通过，返回 1 个赛事。
- `GET /api/tournaments/demo/events`：通过，返回 2 个赛事项目。
- `POST /api/tournaments/demo/matches`：通过，写入长剑比赛，胜者为林澈。
- `POST /api/rankings/calculate` with `persistSnapshot: true` and `publishPageId: "demo"`：通过，生成快照 `4fb80375-67bb-4ec6-9d88-0e7c40a9f551`。
- `GET /api/rankings/4fb80375-67bb-4ec6-9d88-0e7c40a9f551`：通过，读回 3 条快照明细。
- `GET /api/public/rankings/demo`：通过，返回 enabled 公开页、长剑 3 条排名、算法 `hybrid`。
- `/public/rankings/demo?weapon=weapon-longsword`：通过，页面状态 200，包含公开榜单和榜首选手。
- `/embed/rankings/demo?weapon=weapon-longsword`：通过，页面状态 200，包含嵌入榜单和榜首选手。
