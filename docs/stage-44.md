# 阶段 44：自动轮空落位最小闭环

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 44 执行记录，新增自动轮空落位最小闭环 |

## 目标

阶段 44 的目标是让单败淘汰签表在奇数晋级候选场景下继续推进，而不是停在“需要轮空落位模型”的阻断状态。

从问题本质看，晋级不是简单地把当前轮胜者两两配对，而是把“当前轮胜者 + 之前轮空且尚未进入当前轮的人”一起分配到下一轮席位。若候选人数为奇数，最后一名候选不创建虚拟比赛，作为轮空者继续等待后续轮次合并。

## 范围

- Mock Repository 支持自动把初始轮空者和上一轮 pending bye 合并进下一轮候选。
- Supabase Repository 支持同样的候选推导和下一轮生成。
- 比赛工作台不再因为当前轮胜者为奇数直接禁用“生成下一轮”。
- 签表视图显示每轮自动轮空者和下一轮自动轮空提示。

## 非目标

- 不新增 `bracket_slots` 表。
- 不创建虚拟轮空比赛。
- 不把轮空写入 Ranking Engine 比赛输入。
- 不实现种子位蛇形排布或完整签表 slot 可视化。
- 不修改公开页。

## 实现记录

- 更新 `lib/server/repositories/mock.ts`：
  - 修复当前轮完成度判断，改为检查每场比赛是否有有效胜者。
  - 新增 pending bye 推导，首轮从参赛名单中找未进入首轮对阵的选手，后续轮从上一轮胜者中找未进入当前轮的选手。
  - 下一轮生成使用当前胜者和 pending bye 的合并候选列表，奇数候选时最后一名自动轮空。
- 更新 `lib/server/repositories/supabase.ts`：
  - 晋级路径读取首轮参赛名单，推导初始轮空者。
  - 后续轮从历史比赛结果推导 pending bye。
  - 下一轮写入只创建真实对阵，不创建虚拟轮空比赛。
- 更新 `components/matches/match-workbench.tsx`：
  - 晋级禁用条件改为按真实候选人数判断是否已有冠军。
  - 移除奇数胜者直接阻断。
- 更新 `components/matches/bracket-board.tsx`：
  - 显示初始首轮轮空。
  - 显示每个后续轮次中由上一轮胜者自动轮空的人。
  - 当前轮晋级候选为奇数时提示生成下一轮会自动安排轮空。

## 验证记录

- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run browser:verify`：通过，已自动执行 `build`、临时启动生产服务，并验证核心页面。
- `git diff --check`：通过，无空白格式问题。

## 边界与后续

- 本阶段的轮空状态不落库为独立 slot，而是从参赛名单和历史 matches 推导。
- 该模型能支撑当前 MVP 的单败淘汰推进，但复杂签表展示、种子位固定和跨轮 slot 审计仍需要后续 `bracket_slots` 模型。
- Supabase 真实写入路径沿用现有 `matches` 表；执行晋级后只会新增真实比赛记录。
