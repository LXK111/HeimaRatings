# 阶段 18：认证上下文与 RLS 基础

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-29 | Codex | 创建阶段 18 执行记录，新增组织成员表和 RLS 基础策略 |
| v0.2 | 2026-06-29 | Codex | 补充本地验证结果和真库执行边界 |
| v0.3 | 2026-06-29 | Codex | 补充用户本地真库 `db:verify` 验收通过状态 |

## 范围

- 新增组织成员模型，为后续登录用户映射组织做准备。
- 新增 RLS helper function，统一判断当前 Supabase Auth 用户是否属于组织。
- 为当前 MVP 核心表启用 RLS。
- 为管理端成员访问和公开页只读访问建立基础 policy。
- 将 `db:verify` 扩展为按顺序执行 `database/validations/` 下所有 SQL 验收文件。

## 非目标

- 不实现登录 UI。
- 不把现有服务端 Repository 从 service role 切到用户 JWT。
- 不实现组织切换器。
- 不替代阶段 15 的 Repository 组织过滤，也不替代阶段 16 的数据库 trigger。

## 实现记录

- 新增 `database/migrations/202606290003_auth_rls_foundation.sql`：
  - 创建 `organization_members` 表。
  - 增加 `admin`、`editor`、`viewer` 三种成员角色。
  - 创建 `current_user_is_org_member()` 和 `current_user_is_org_admin()`。
  - 为核心表启用 RLS。
  - 为组织成员访问、管理端数据访问和公开页只读访问创建 policy。
- 新增 `database/validations/202606290004_verify_auth_rls_foundation.sql`：
  - 检查 `organization_members` 表存在。
  - 检查 RLS helper function 存在。
  - 检查核心表已启用 RLS。
  - 检查阶段 18 policy 存在。
- 更新 `scripts/verify_database_constraints.mjs`：
  - 继续支持 `.env.database.local`。
  - 改为按文件名顺序执行 `database/validations/` 下所有 `.sql` 文件。
- 更新 `lib/database/types.ts`，新增 `OrganizationMemberRow`。

## 当前限制

- 现有应用服务端仍使用 `SUPABASE_SERVICE_ROLE_KEY`，service role 会绕过 RLS。
- RLS 策略是数据库侧基础设施，实际用户级访问需要后续把请求上下文切到 Supabase Auth JWT。
- 公开页策略目前只覆盖 `public_pages` 和 `public_page_snapshots` 的直接只读入口；应用公开页仍由服务端 Repository 聚合返回。

## 验证记录

- `git diff --check`：通过，无空白格式问题。
- `DATABASE_URL= npm run db:verify` 缺配置路径：通过，未配置连接串时明确提示。
- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- 真库 RLS migration 和新增 validation：已由用户在本地数据库连接环境执行 `npm run db:verify` 验收通过。
