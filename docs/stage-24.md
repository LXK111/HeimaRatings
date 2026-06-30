# 阶段 24：数据库写权限 RLS 收紧

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-30 | Codex | 创建阶段 24 执行记录，收紧数据库写权限 RLS 到 admin/editor |
| v0.2 | 2026-06-30 | Codex | 补充阶段 24 真库 migration 和 db:verify 执行状态 |

## 范围

- 新增数据库 migration，将核心业务表写权限从“组织成员可写”收紧为“组织 admin/editor 可写”。
- 保留组织成员对管理数据的读取权限。
- 保留公开榜单和公开页快照的匿名读取策略。
- 新增 RLS 写权限验证 SQL，覆盖旧 manage policy 移除、新写策略存在和 viewer/editor 行为差异。
- 更新既有 RLS foundation 验证，使其匹配阶段 24 后的最终 policy 状态。

## 非目标

- 不改管理端 UI。
- 不新增创建/编辑业务表单。
- 不改 Supabase Auth 登录流程。
- 不删除 service role Repository。
- 不在线执行真库 DDL。

## 实现记录

- 通过 Supabase CLI 创建 migration 文件名：
  - `20260630044713_restrict_rls_write_roles.sql`
- 新增 `database/migrations/20260630044713_restrict_rls_write_roles.sql`：
  - 新增 `current_user_can_write_org(organization_id)`。
  - 将核心表的 `*_member_manage` policy 拆为 `select/insert/update/delete`。
  - `select` 使用 `current_user_is_org_member()`。
  - `insert/update/delete` 使用 `current_user_can_write_org()`。
  - 公开读取策略显式授权给 `anon, authenticated`。
- 更新 `database/validations/202606290004_verify_auth_rls_foundation.sql`：
  - 增加 `current_user_can_write_org` 检查。
  - 更新 policy 名称为阶段 24 后的最终状态。
- 新增 `database/validations/202606300005_verify_rls_write_roles.sql`：
  - 检查旧 manage policy 已移除。
  - 检查新写策略存在。
  - 检查写策略使用 `current_user_can_write_org()`。
  - 在事务内构造 viewer/editor 用户，验证 viewer 不能写、editor 能写。

## 当前限制

- 阶段 24 migration 已由用户在 Supabase 真库执行。
- 数据库层已收紧写权限，但管理端仍保留阶段 22 的应用层写权限校验，用于更早返回 403。
- `organization_members` 自身仍仅允许组织 admin 管理。

## 验收方式

1. 在真库执行：

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/20260630044713_restrict_rls_write_roles.sql
```

2. 执行数据库约束和 RLS 验收：

```bash
npm run db:verify
```

3. 本地代码验收：

```bash
npm run check
HEIMA_RATINGS_DATA_SOURCE=mock npm run verify
```

## 验证记录

- `git diff --check`：通过，无空白格式问题。
- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- 真库 migration：已由用户执行 `database/migrations/20260630044713_restrict_rls_write_roles.sql`。
- `npm run db:verify`：已由用户执行完成。
