# 阶段 32：签表生成最小闭环

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-30 | Codex | 创建阶段 32 执行记录，新增签表生成最小闭环 |

## 范围

- 基于比赛项目参赛名单生成初始对阵草稿。
- 复用现有 `matches` 表承载签表生成结果。
- 为 Repository 增加 `generateTournamentEventBracket()`。
- 为 `/api/tournaments/[id]/events/[eventId]/bracket/generate` 增加生成接口。
- 在 `/tournaments/[id]/events` 页面增加“生成签表”按钮和可生成状态提示。

## 非目标

- 不新增数据库表。
- 不生成可视化树状图。
- 不处理晋级。
- 不覆盖已有比赛。
- 不支持 Swiss/custom 自动编排。

## 实现记录

- 更新 `lib/server/repositories/types.ts`：
  - 新增 `generateTournamentEventBracket()` 契约。
- 更新 `lib/server/repositories/supabase.ts`：
  - 读取 `tournament_event_entries` 中 `registered` 选手。
  - 按 `seed asc nulls last` 排序。
  - `single_elimination` 按首尾种子配对生成第 1 轮。
  - `round_robin` 生成所有两两对阵。
  - 已有 matches 时拒绝生成。
  - 写入 `matches` 时比分为 `0-0`，`winner_id` 和 `played_at` 为空。
- 更新 `lib/server/repositories/mock.ts`：
  - 补齐 Mock 模式签表生成接口。
- 新增 `app/api/tournaments/[id]/events/[eventId]/bracket/generate/route.ts`：
  - 提供签表生成 API。
  - 写接口复用 `requireManagementApiWriteAccess()`，要求当前组织 `admin/editor`。
- 新增 `lib/server/bracket-actions.ts`：
  - 提供页面“生成签表”按钮使用的 Server Action。
- 更新 `app/tournaments/[id]/events/page.tsx`：
  - 展示项目是否可生成签表。
  - 已有比赛、参赛不足 2 人或暂不支持赛制时禁用按钮。

## 当前限制

- 单败淘汰奇数人数时，中间种子视为轮空，本阶段不显式创建轮空记录。
- 本阶段只生成第 1 轮或循环赛全部初始对阵，不处理赛后晋级。
- Mock Repository 的生成结果不会持久化，主要用于默认模式编译和本地 smoke。

## 验证记录

- `git diff --check`：通过，无空白格式问题。
- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
