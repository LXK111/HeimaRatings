# 阶段 30：比赛项目真实创建编辑闭环

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-30 | Codex | 创建阶段 30 执行记录，新增比赛项目真实创建编辑闭环 |

## 范围

- 将比赛项目管理从只读展示推进到可新增、可编辑。
- 为 Repository 增加 `createTournamentEvent` 和 `updateTournamentEvent` 写入接口。
- 为 Supabase Repository 增加 `tournament_events` insert/update 持久化路径。
- 为 `/api/tournaments/[id]/events` 增加 `POST` 和 `PATCH` 管理写接口。
- 在 `/tournaments/[id]/events` 页面增加新增表单和行内编辑表单。

## 非目标

- 不新增数据库 migration。
- 不实现比赛项目删除。
- 不生成签表。
- 不实现报名、淘汰晋级或项目级排名重算。

## 实现记录

- 更新 `lib/server/repositories/types.ts`：
  - 新增 `CreateTournamentEventInput` 和 `UpdateTournamentEventInput`。
  - 扩展 `AppRepository` 的比赛项目写入契约。
- 更新 `lib/server/repositories/supabase.ts`：
  - 新增 `createTournamentEvent()` 和 `updateTournamentEvent()`。
  - 写入前校验赛事属于当前组织。
  - 写入前校验武器属于当前组织。
  - 对项目名称、武器、赛制和状态做统一规范化。
- 更新 `lib/server/repositories/mock.ts`：
  - 补齐 Mock 模式下的比赛项目创建和编辑接口。
- 更新 `app/api/tournaments/[id]/events/route.ts`：
  - 保留登录后的 `GET` 读取路径。
  - 新增 `POST` 创建比赛项目。
  - 新增 `PATCH` 编辑比赛项目。
  - 写接口复用 `requireManagementApiWriteAccess()`，要求当前组织 `admin/editor`。
- 新增 `lib/server/tournament-event-actions.ts`：
  - 提供 `/tournaments/[id]/events` 页面表单使用的 Server Actions。
  - 页面提交仍通过 Repository 写入，由 Supabase RLS 约束真实权限。
- 更新 `app/tournaments/[id]/events/page.tsx`：
  - 增加新增比赛项目表单。
  - 增加行内编辑表单，可修改名称、武器、赛制和状态。

## 当前限制

- Mock Repository 的新增/编辑结果不会持久化，主要用于默认模式编译和本地 smoke。
- Supabase 模式下真实写入受当前登录用户组织成员角色和数据库 RLS 共同约束。
- 页面表单当前使用基础 Server Action 提交，暂未增加提交后的内联错误展示。
- 本阶段只维护比赛项目元数据，不生成签表，不改写比赛结果。

## 验证记录

- `git diff --check`：通过，无空白格式问题。
- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
