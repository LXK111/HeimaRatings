# 阶段 4：比赛录入与排名计算闭环

## 修改记录

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-24 | TRAE | 创建阶段 4 执行记录，记录页面临时闭环实现 |
| v0.2 | 2026-06-24 | TRAE | 补充阶段 4 验证结果 |

## 范围

- 将比赛录入页从静态表格改造为可交互工作台。
- 支持新增比赛草稿，并加入当前页面本地比赛队列。
- 支持选择武器类型和排名算法，调用 Ranking Engine 重新计算排名。
- 页面内展示本次计算结果，不保存数据库和排名快照。

## 实现内容

- `components/matches/match-workbench.tsx`：新增客户端工作台，负责表单状态、比赛队列、排名计算和结果展示。
- `app/tournaments/[id]/matches/page.tsx`：改造为动态赛事入口，传入赛事 ID 并渲染工作台。
- `lib/server/mock-repository.ts`：补强比赛草稿校验，限制双方选手不同、轮次有效、比分为非负数字。

## 数据流

1. 页面通过 `/api/tournaments/[id]/matches` 加载当前赛事比赛记录。
2. 用户录入比赛后，页面调用 `POST /api/tournaments/[id]/matches`。
3. API 返回比赛草稿，页面追加到本地状态。
4. 用户选择武器类型和算法，点击重新计算。
5. 页面基于当前本地比赛队列组装完整 `RankingEngineInput`。
6. 页面调用 `/api/rankings/calculate`，展示返回排名。

## 当前限制

- 新增比赛只存在于当前页面状态，刷新页面会丢失。
- 本阶段不保存 `ranking_snapshots`。
- 公开榜单和嵌入榜单仍使用阶段 2 Mock 数据。
- 迅捷剑当前 Mock 数据只有 1 名有初始积分的选手，不能完成有效排名计算。

## 验证记录

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `POST /api/tournaments/demo/matches`：通过，返回比赛草稿并包含赛事、项目、武器、轮次、比分和胜者字段。
- `POST /api/rankings/calculate`：通过，使用 `hybrid` 算法调用 Python Ranking Engine 并返回排名结果。
- 页面验证：`/tournaments/demo/matches` 可正常渲染，点击“重新计算排名”后展示成功提示和排名结果。
