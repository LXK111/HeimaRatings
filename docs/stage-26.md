# 阶段 26：管理端 API Cookie 登录态验收脚本

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-30 | Codex | 创建阶段 26 执行记录，新增管理端 API Cookie 登录态验收脚本 |
| v0.2 | 2026-06-30 | Codex | 补充管理端 API Cookie 登录态完整验收通过状态 |

## 范围

- 新增管理端 API Cookie 登录态端到端验收脚本。
- 使用 `@supabase/ssr` 在脚本内构造内存 cookie jar。
- 用 viewer/editor 测试账号登录并生成 Supabase SSR auth cookies。
- 带 cookie 调用本地 Next.js 管理 API，验证真实产品访问路径。
- 验证匿名管理 API 返回 401。
- 验证 viewer 可读管理 API，但写接口返回 403。
- 验证 editor 可读管理 API，并可调用持久化排名快照写接口。
- 验证公开榜单 API 匿名可访问。
- 新增 `npm run auth:api:verify` 命令。

## 非目标

- 不自动启动 Next.js 服务。
- 不覆盖浏览器里的真实 cookie。
- 不清理 editor 生成的排名快照。
- 不替代阶段 25 的 Data API RLS 验收。
- 不新增数据库 migration。

## 实现记录

- 新增 `scripts/verify_management_auth_api_e2e.mjs`：
  - 自动读取 `.env.local` 和 `.env.database.local`。
  - 读取 Supabase URL、publishable key 和 viewer/editor 测试账号。
  - 默认本地服务地址为 `http://localhost:3000`。
  - 可通过 `HEIMA_RATINGS_API_VERIFY_BASE_URL` 或 `HEIMA_RATINGS_BASE_URL` 覆盖服务地址。
  - 使用 `@supabase/ssr` 登录并收集 auth cookies。
  - 调用 `/api/weapons` 验证匿名、viewer、editor 读权限。
  - 调用 `/api/rankings/calculate` 的 `persistSnapshot: true` 路径验证 viewer/editor 写权限差异。
- 更新 `package.json`：
  - 新增 `auth:api:verify` 脚本。

## 运行方式

先启动 Supabase 模式本地服务：

```bash
npm run dev
```

如果本地服务不是 `http://localhost:3000`，执行时指定地址：

```bash
HEIMA_RATINGS_API_VERIFY_BASE_URL="http://localhost:3001" npm run auth:api:verify
```

## 当前限制

- editor 写路径会生成一条新的 ranking snapshot，用于验证管理 API 的真实持久化路径。
- 完整验收需要已配置阶段 25 的 viewer/editor 测试账号环境变量。

## 验证记录

- `git diff --check`：通过，无空白格式问题。
- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_API_VERIFY_BASE_URL=http://localhost:3001 npm run auth:api:verify`：通过，已验证匿名公开 API、匿名管理 API 401、viewer 读/写权限和 editor 读/写权限。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
