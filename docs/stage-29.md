# 阶段 29：赛事真实创建编辑闭环

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-30 | Codex | 创建阶段 29 执行记录，新增赛事真实创建编辑闭环 |

## 范围

- 将赛事管理从只读展示推进到可新增、可编辑。
- 为 Repository 增加 `createTournament` 和 `updateTournament` 写入接口。
- 为 Supabase Repository 增加 `tournaments` insert/update 持久化路径。
- 为 `/api/tournaments` 增加 `POST` 和 `PATCH` 管理写接口。
- 在 `/tournaments` 页面增加新增表单和行内编辑表单。
- 扩展 `TournamentSummary`，让页面可展示和编辑赛制、默认算法、状态和时间。

## 非目标

- 不新增数据库 migration。
- 不实现赛事删除。
- 不在本阶段创建比赛项目。
- 不实现报名、签表、淘汰晋级或排名重算。

## 实现记录

- 更新 `lib/domain/types.ts`：
  - 为 `TournamentSummary` 补充 `format`、`startedAt` 和 `endedAt`。
- 更新 `lib/server/repositories/types.ts`：
  - 新增 `CreateTournamentInput` 和 `UpdateTournamentInput`。
  - 扩展 `AppRepository` 的赛事写入契约。
- 更新 `lib/server/repositories/supabase.ts`：
  - 新增 `createTournament()` 和 `updateTournament()`。
  - 写入时绑定当前 `organization_id`。
  - 对名称、赛制、状态、默认算法和时间做统一规范化。
- 更新 `lib/server/repositories/mock.ts` 和 `lib/mock/dashboard-data.ts`：
  - 补齐 Mock 模式下的赛事创建、编辑和赛制字段。
- 更新 `app/api/tournaments/route.ts`：
  - 保留登录后的 `GET` 读取路径。
  - 新增 `POST` 创建赛事。
  - 新增 `PATCH` 编辑赛事。
  - 写接口复用 `requireManagementApiWriteAccess()`，要求当前组织 `admin/editor`。
- 新增 `lib/server/tournament-actions.ts`：
  - 提供 `/tournaments` 页面表单使用的 Server Actions。
  - 页面提交仍通过 Repository 写入，由 Supabase RLS 约束真实权限。
- 更新 `app/tournaments/page.tsx`：
  - 增加新增赛事表单。
  - 增加行内编辑表单，可修改名称、赛制、状态、默认算法和起止时间。

## 当前限制

- Mock Repository 的新增/编辑结果不会持久化，主要用于默认模式编译和本地 smoke。
- Supabase 模式下真实写入受当前登录用户组织成员角色和数据库 RLS 共同约束。
- 页面表单当前使用基础 Server Action 提交，暂未增加提交后的内联错误展示。
- 本阶段只维护赛事容器，不自动创建比赛项目。

## 验证记录

- `git diff --check`：通过，无空白格式问题。
- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
