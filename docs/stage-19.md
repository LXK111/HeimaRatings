# 阶段 19：请求级组织上下文

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-29 | Codex | 创建阶段 19 执行记录，接入请求级组织上下文 |
| v0.2 | 2026-06-29 | Codex | 补充构建和 Mock 一键验收结果 |

## 范围

- 新增 Repository 请求上下文模型。
- API Route 从请求 header/cookie 读取当前组织上下文。
- Server Page 从 Next.js `headers()` / `cookies()` 读取当前组织上下文。
- Supabase Repository 支持按请求传入的 `organizationId` 或 `organizationSlug` 解析当前组织。
- 保留 `HEIMA_RATINGS_ORGANIZATION_SLUG` 和默认 demo 组织作为 fallback。

## 非目标

- 不实现登录页面。
- 不创建 Supabase browser client。
- 不把现有服务端 Repository 从 service role 切换到用户 JWT。
- 不实现组织切换 UI。
- 不改变公开页 URL 结构。

## 实现记录

- 新增 `lib/server/repositories/context.ts`：
  - 定义 `RepositoryContext`。
  - 支持从 `Request` 读取：
    - `x-heima-organization-id`
    - `x-heima-organization-slug`
    - `heima_organization_id`
    - `heima_organization_slug`
- 新增 `lib/server/request-context.ts`：
  - Server Page 使用 Next.js `headers()` / `cookies()` 读取组织上下文。
- 更新 `lib/server/repositories/factory.ts`：
  - `getRepository(context)` 支持请求级上下文。
  - Supabase Repository 按上下文 cache，避免不同组织请求复用同一个组织解析结果。
- 更新 `lib/server/repositories/supabase.ts`：
  - 构造函数接收 `RepositoryContext`。
  - 优先按 `organizationId` 解析组织。
  - 其次按 `organizationSlug` 解析组织。
  - 最后回退到 `HEIMA_RATINGS_ORGANIZATION_SLUG` 或默认 demo slug。
- 更新所有管理端 Server Page 和 API Route，使其调用 Repository 时携带请求上下文。

## 当前限制

- 当前组织可以由 header/cookie 指定，但还没有用户登录态校验。
- RLS 已在数据库侧准备好，但现有服务端仍使用 service role。
- 组织切换 UI 和成员角色校验留到后续阶段。

## 验证记录

- `npm run check`：通过，TypeScript 无错误。
- `git diff --check`：通过，无空白格式问题。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
