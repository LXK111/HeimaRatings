# 阶段 34：项目级排名闭环

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-30 | Codex | 创建阶段 34 执行记录，新增项目级排名计算与快照保存入口 |

## 范围

- 将项目级排名作为管理端一等能力展示。
- 在 `/tournaments/[id]/rankings` 页面选择比赛项目并计算项目级排名。
- 复用现有 `/api/rankings/calculate` 的 `eventId` 能力。
- 项目级排名可预览计算，也可保存为带 `event_id` 的排名快照。
- Mock 模式补齐按 `eventId` 过滤比赛输入。

## 非目标

- 不新增数据库表。
- 不修改 Ranking Engine 算法。
- 不把项目级榜单发布到公开页。
- 不做项目级历史快照列表。
- 不做签表树状图或轮空模型增强。

## 实现记录

- 更新 `lib/server/mock-repository.ts`：
  - `buildRankingEngineInput()` 支持 `eventId`。
  - Mock 排名输入按项目过滤比赛。
- 更新 `lib/server/repositories/mock.ts`：
  - 将 `BuildRankingEngineInputOptions.eventId` 传入 Mock 排名输入。
- 新增 `components/rankings/event-ranking-workbench.tsx`：
  - 提供项目选择、算法选择、项目排名计算和项目快照保存。
  - 请求 `/api/rankings/calculate` 时带上 `tournamentId`、`weaponTypeId` 和 `eventId`。
  - 保存快照时使用 `persistSnapshot: true`，让现有 Repository 写入 `ranking_snapshots.event_id`。
- 更新 `app/tournaments/[id]/rankings/page.tsx`：
  - 读取当前赛事的比赛项目、选手和武器。
  - 在已发布分武器榜单上方增加项目级排名工作台。

## 当前限制

- 项目级快照已保存到数据库，但暂不在公开页展示。
- 页面暂不展示项目级历史快照列表。
- Mock 模式只覆盖本地演示路径，真实持久化仍以 Supabase Repository 为准。

## 验证记录

- `git diff --check`：通过，无空白格式问题。
- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
