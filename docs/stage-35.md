# 阶段 35：项目级排名快照展示入口

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-30 | Codex | 创建阶段 35 执行记录，新增项目级排名快照查询与展示入口 |

## 范围

- 让已保存的项目级排名快照在管理端可查看。
- 在 `/tournaments/[id]/rankings` 页面展示每个项目最近一次项目榜。
- Repository 增加项目级快照查询契约。
- Supabase 模式读取 `ranking_snapshots.event_id is not null` 的最新项目快照。
- Mock 模式提供默认项目快照展示数据。

## 非目标

- 不新增数据库表。
- 不改公开页模型。
- 不为项目榜生成公开 URL。
- 不做项目快照历史列表。
- 不做签表树状图或轮空模型增强。

## 实现记录

- 更新 `lib/server/repositories/types.ts`：
  - 新增 `TournamentEventRankingSnapshot`。
  - 新增 `listTournamentEventRankingSnapshots()` 契约。
- 更新 `lib/server/repositories/supabase.ts`：
  - 查询当前赛事下 `event_id` 不为空的排名快照。
  - 按 `generated_at desc` 取每个项目最新一份快照。
  - 复用 `getRankingSnapshot()` 读取排名明细。
- 更新 `lib/server/repositories/mock.ts`：
  - 为默认模式返回每个有比赛项目的演示项目榜。
- 更新 `components/rankings/event-ranking-workbench.tsx`：
  - 保存项目级快照后刷新服务端页面数据。
- 更新 `app/tournaments/[id]/rankings/page.tsx`：
  - 读取项目级快照列表。
  - 展示项目名、武器、算法、生成时间、快照 ID 和排名表。

## 当前限制

- 当前只展示每个项目最近一份快照。
- 项目级快照仍只在管理端展示，未进入公开页。
- Mock 模式展示的是演示项目榜，不代表真实持久化历史。

## 验证记录

- `git diff --check`：通过，无空白格式问题。
- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
