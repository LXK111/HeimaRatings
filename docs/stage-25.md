# 阶段 25：Supabase Auth/RLS 端到端验收脚本

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-30 | Codex | 创建阶段 25 执行记录，新增 Supabase Auth/RLS 端到端验收脚本 |
| v0.2 | 2026-06-30 | Codex | 补充完整真库 Auth/RLS 验收通过状态 |

## 范围

- 新增真库 Auth/RLS 端到端验收脚本。
- 使用 Supabase Auth email/password 登录 viewer 和 editor 测试账号。
- 通过用户 JWT 直接访问 Supabase Data API，验证数据库 RLS 行为。
- 验证匿名用户可读取已启用公开页。
- 验证 viewer 可读所属组织数据但不能写核心业务表。
- 验证 editor 可完成一条临时 weapon 的 insert/update/delete 生命周期。
- 新增 `npm run auth:verify` 命令。

## 非目标

- 不创建 Supabase Auth 测试用户。
- 不自动改写 `organization_members`。
- 不使用 service role 做测试数据初始化。
- 不启动 Next.js 本地服务。
- 不覆盖浏览器 cookie 登录态。

## 实现记录

- 新增 `scripts/verify_supabase_auth_rls_e2e.mjs`：
  - 自动读取 `.env.local` 和 `.env.database.local`。
  - 读取 Supabase URL 和 publishable key。
  - 使用 `HEIMA_RATINGS_RLS_VIEWER_EMAIL/PASSWORD` 登录 viewer。
  - 使用 `HEIMA_RATINGS_RLS_EDITOR_EMAIL/PASSWORD` 登录 editor。
  - 默认验证组织 slug 为 `hema-ratings-demo`，可用 `HEIMA_RATINGS_RLS_ORGANIZATION_SLUG` 覆盖。
  - 默认验证公开页 page id 为 `demo`，可用 `HEIMA_RATINGS_RLS_PUBLIC_PAGE_ID` 覆盖。
  - editor 写入的临时 `weapon_types` 行会在脚本内删除。
- 更新 `package.json`：
  - 新增 `auth:verify` 脚本。

## 环境变量

```bash
HEIMA_RATINGS_RLS_VIEWER_EMAIL="viewer@example.com"
HEIMA_RATINGS_RLS_VIEWER_PASSWORD="..."
HEIMA_RATINGS_RLS_EDITOR_EMAIL="editor@example.com"
HEIMA_RATINGS_RLS_EDITOR_PASSWORD="..."
HEIMA_RATINGS_RLS_ORGANIZATION_SLUG="hema-ratings-demo"
HEIMA_RATINGS_RLS_PUBLIC_PAGE_ID="demo"
```

测试账号需要满足：

- viewer 用户存在于 Supabase Auth。
- editor 用户存在于 Supabase Auth。
- 两个用户都属于同一个组织。
- `organization_members.role` 分别为 `viewer` 和 `editor`。

## 验证记录

- `npm run auth:verify` 缺测试账号配置路径：通过，缺少测试账号环境变量时会明确报错。
- `git diff --check`：通过，无空白格式问题。
- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- 完整真库 `npm run auth:verify`：已由用户配置 viewer/editor 测试账号后执行完成。
