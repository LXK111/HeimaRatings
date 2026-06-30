# 阶段 33：淘汰晋级最小闭环

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-30 | Codex | 创建阶段 33 执行记录，新增比赛结果更新和单败晋级最小闭环 |

## 范围

- 为已有 `matches` 草稿补充比分和胜者更新能力。
- 为单败淘汰项目增加“生成下一轮”能力。
- 继续复用 `matches` 表承载签表和晋级结果。
- 在比赛录入页展示已有对阵，并允许行内保存比赛结果。
- 在比赛录入页基于当前项目触发下一轮生成。

## 非目标

- 不新增签表树表。
- 不处理双败、瑞士轮或自定义赛制。
- 不做可视化树状签表。
- 不自动计算三四名赛。
- 不解决奇数晋级人数的完整轮空落位模型。

## 实现记录

- 更新 `lib/domain/types.ts`：
  - `MatchSummary` 补充 `player1Id`、`player2Id`、`winnerId` 和 `playedAt`。
- 更新 `lib/server/repositories/types.ts`：
  - 新增 `UpdateMatchResultInput`。
  - 新增 `updateMatchResult()` 和 `advanceTournamentEventBracket()` 契约。
- 更新 `lib/server/repositories/supabase.ts`：
  - `toMatchSummary()` 返回选手 ID、胜者 ID 和完成时间。
  - 新增 `updateMatchResult()`，更新比分、胜者和 `played_at`。
  - 新增 `advanceTournamentEventBracket()`，读取当前最新轮胜者并创建下一轮草稿。
- 更新 `lib/server/repositories/mock.ts` 和 `lib/server/mock-repository.ts`：
  - Mock 模式支持比赛结果更新。
  - Mock 模式支持在当前进程内追加签表和晋级草稿。
- 更新 `app/api/tournaments/[id]/matches/route.ts`：
  - 新增 `PATCH`，用于保存已有比赛结果。
- 新增 `app/api/tournaments/[id]/events/[eventId]/bracket/advance/route.ts`：
  - 提供单败淘汰晋级 API。
  - 写接口复用当前管理端 `admin/editor` 权限。
- 更新 `components/matches/match-workbench.tsx`：
  - 接入保存比赛结果和生成下一轮动作。
  - 比赛结果变更后清空旧排名结果，避免误用过期计算结果。
- 更新 `components/matches/match-list-panel.tsx`：
  - 每行增加比分和胜者保存表单。
  - 增加“生成下一轮”按钮和禁用原因。

## 当前限制

- 晋级仅支持 `single_elimination`。
- 只有当前最新轮所有比赛都有非平局胜者时，才允许生成下一轮。
- 当前轮只剩 1 名胜者时视为已有冠军，不再生成下一轮。
- 奇数胜者会暂时按可配对人数生成下一轮，完整轮空落位留到后续签表模型增强。
- Mock 模式为进程内持久，重启开发服务后仍回到默认演示数据。

## 验证记录

- `git diff --check`：通过，无空白格式问题。
- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
