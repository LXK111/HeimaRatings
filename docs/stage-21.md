# 阶段 21：最小 Supabase Auth 登录保护

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-29 | Codex | 创建阶段 21 执行记录，新增最小 Supabase Auth 登录保护 |
| v0.2 | 2026-06-29 | Codex | 补充构建和 Mock 一键验收结果 |

## 范围

- 引入 `@supabase/ssr`，为 Next.js 服务端 Auth 会话做准备。
- 新增最小登录页 `/login`，支持 email/password 登录。
- 管理端 Shell 在 Supabase 数据源下校验登录用户。
- 管理 API 在 Supabase 数据源下返回 401，阻止匿名访问。
- 公开榜单和嵌入页继续匿名访问。
- 保留 Mock 模式免登录，保障本地验证闭环。

## 非目标

- 不实现注册流程。
- 不实现 magic link 或 OAuth。
- 不把 Repository 切换到用户 JWT。
- 不按 `organization_members` 过滤组织列表。
- 不实现完整组织成员授权 UI。

## 实现记录

- 安装 `@supabase/ssr`。
- 新增 `lib/server/supabase/auth.ts`：
  - 创建 SSR Supabase Auth client。
  - 支持 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。
  - 兼容 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
  - 在 `HEIMA_RATINGS_DATA_SOURCE=supabase` 且 `HEIMA_RATINGS_AUTH_REQUIRED !== "false"` 时启用管理端登录保护。
- 新增 `lib/server/auth-actions.ts`：
  - `signInWithPassword()`。
  - `signOut()`。
- 新增 `lib/server/auth-guard.ts`：
  - `requireManagementUser()` 用于管理端页面。
  - `requireManagementApiUser()` 用于管理 API。
- 新增 `app/login/page.tsx`。
- 更新 `AppShell`：
  - 管理端进入前校验登录。
  - 显示当前用户邮箱。
  - 增加退出按钮。
- 更新管理 API：
  - `/api/weapons`
  - `/api/players`
  - `/api/tournaments`
  - `/api/tournaments/[id]`
  - `/api/tournaments/[id]/events`
  - `/api/tournaments/[id]/matches`
  - `/api/rankings/[snapshotId]`
  - `/api/rankings/calculate`

## 当前限制

- 当前服务端数据访问仍使用 service role，RLS 不会限制这条服务端路径。
- 登录用户还没有和 `organization_members` 做成员组织过滤。
- 组织切换仍是 cookie 级开发期能力，后续需要绑定用户成员关系。

## 验证记录

- `npm run check`：通过，TypeScript 无错误。
- `git diff --check`：通过，无空白格式问题。
- `npm run build`：通过，Next.js 生产构建成功，新增 `/login` 路由。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
