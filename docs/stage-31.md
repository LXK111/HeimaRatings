# 阶段 31：项目参赛名单闭环

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-30 | Codex | 创建阶段 31 执行记录，新增项目参赛名单模型和管理闭环 |

## 范围

- 新增比赛项目参赛名单模型。
- 为每个比赛项目维护参赛选手、种子序号和报名状态。
- 为 Repository 增加报名名单读取、加入和更新接口。
- 为 Supabase Repository 增加 `tournament_event_entries` 持久化路径。
- 为 `/api/tournaments/[id]/events/[eventId]/entries` 增加 `GET`、`POST` 和 `PATCH`。
- 在 `/tournaments/[id]/events` 页面展示和维护项目参赛名单。

## 非目标

- 不生成签表。
- 不创建比赛对阵。
- 不处理淘汰晋级。
- 不删除报名记录；退赛通过状态标记表达。

## 实现记录

- 新增 `database/migrations/20260630124841_event_entries.sql`：
  - 新增 `tournament_event_entries` 表。
  - 新增 `event_id + player_id` 唯一约束。
  - 新增 seed 正整数约束和 `registered/withdrawn` 状态约束。
  - 新增跨组织一致性 trigger。
  - 新增 RLS policy：组织成员可读，`admin/editor` 可写。
- 新增 `database/validations/202606300006_verify_event_entries.sql`：
  - 验证表、索引、trigger 和 RLS policy 存在。
  - 验证跨组织报名被拒绝。
  - 验证 viewer 不可写、editor 可写。
- 更新 `lib/domain/types.ts` 和 `lib/database/types.ts`：
  - 新增参赛名单状态和行类型。
- 更新 `lib/server/repositories/types.ts`：
  - 新增参赛名单 Repository 契约。
- 更新 `lib/server/repositories/supabase.ts`：
  - 新增读取、加入和更新报名名单。
  - 写入前校验赛事、项目和选手属于当前组织。
- 更新 `lib/server/repositories/mock.ts`、`lib/server/mock-repository.ts` 和 `lib/mock/dashboard-data.ts`：
  - 补齐 Mock 模式报名名单数据和写入接口。
- 新增 `app/api/tournaments/[id]/events/[eventId]/entries/route.ts`：
  - 提供报名名单读取、加入和更新 API。
- 新增 `lib/server/tournament-event-entry-actions.ts`：
  - 提供页面表单使用的 Server Actions。
- 更新 `app/tournaments/[id]/events/page.tsx`：
  - 每个比赛项目展示报名名单。
  - 支持从当前组织选手中加入项目。
  - 支持维护 seed 和参赛/退赛状态。

## 当前限制

- Mock Repository 的新增/编辑结果不会持久化，主要用于默认模式编译和本地 smoke。
- Supabase 真库需要先执行阶段 31 migration，再运行 `npm run db:verify`。
- 本阶段只维护签表输入，不生成签表。

## 验证记录

- `git diff --check`：通过，无空白格式问题。
- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- `npm run db:verify`：已由用户在真库应用阶段 31 migration 后执行完成。
