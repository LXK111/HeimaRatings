# 阶段 54：管理端签表视图读取 bracket_slots

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 54 执行记录，新增管理端签表视图读取 bracket_slots |

## 目标

阶段 54 的目标是让管理端签表视图优先读取 `bracket_slots`。

阶段 52 和阶段 53 已经让初始生成与晋级落位写入 slots。如果页面继续只从 `matches + entries` 推导，就无法展示固定签位、轮空 slot 和晋级来源。本阶段把展示读取路径接到 slot 模型，同时保留旧 matches 推导兜底。

## 范围

- Repository 增加 `listTournamentEventBracketSlots(tournamentId, eventId)`。
- 新增管理 API：`GET /api/tournaments/[id]/events/[eventId]/bracket/slots`。
- 比赛工作台在选中项目变化时加载 slots。
- 生成下一轮后刷新 slots。
- `BracketBoard` 优先按 slots 分轮展示：
  - `occupied` 展示落位选手。
  - `bye` 展示轮空。
  - `advanced` 展示晋级选手和来源比赛。
- 无 slots 时保留原 `matches + entries` 推导展示。

## 非目标

- 不新增 slot 编辑表单。
- 不做拖拽调签。
- 不改变 Ranking Engine 输入。
- 不移除旧 matches 推导兜底。

## 实现记录

- 更新 `lib/server/repositories/types.ts`，新增 `listTournamentEventBracketSlots()` 契约。
- 更新 `lib/server/repositories/supabase.ts`，读取 slots、选手名和来源比赛名。
- 更新 `lib/server/repositories/mock.ts`，返回 Mock 内存 slots。
- 新增 `app/api/tournaments/[id]/events/[eventId]/bracket/slots/route.ts`。
- 更新 `components/matches/match-workbench.tsx`，加载并刷新 bracket slots。
- 更新 `components/matches/bracket-board.tsx`，优先按 slots 展示固定签位。
- 更新 `scripts/verify_supabase_bracket_slots_advancement.mjs`，增加 slots API 读取验收。

## 验证记录

- `node --check scripts/verify_supabase_bracket_slots_advancement.mjs`：通过，脚本语法无错误。
- `npm run bracket:slots:advance:verify`：通过，真库验证 slots API 可读取首轮和下一轮 slots。
- `npm run check`：通过，TypeScript 类型检查无错误。
- `npm run db:verify`：通过，数据库约束验收仍通过。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，Mock 模式完整本地验收通过。
- `git diff --check`：通过，当前变更无空白格式问题。

## 边界与后续

- 当前阶段完成 slots 只读展示，不支持页面编辑 slots。
- 后续可补浏览器视觉验收，覆盖签表页面中的轮空、晋级来源和固定签位展示。
