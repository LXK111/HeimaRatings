# 阶段 41：Supabase 登录态浏览器验收

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 41 执行记录，新增 Supabase 登录态浏览器验收 |

## 范围

- 新增 Supabase 管理端登录态浏览器验收命令。
- 验证匿名访问管理端页面会跳转到登录页。
- 验证公开榜单页在匿名状态下仍可访问。
- 使用真实 editor 测试账号通过登录表单进入管理端。
- 验证登录后可访问武器管理页和比赛录入页。
- 验证比赛录入页的“发布目标”控件在登录态下可见。

## 非目标

- 不创建或修改 Supabase Auth 用户。
- 不修改数据库 RLS。
- 不覆盖 viewer 写权限页面流。
- 不执行真实管理表单写入。

## 实现记录

- 新增 `scripts/verify_management_auth_browser_e2e.mjs`：
  - 读取 `.env.local` 和 `.env.database.local`。
  - 以 Supabase 数据源和登录保护开启模式执行 `npm run build`。
  - 启动临时 `next start` 服务。
  - 使用 Playwright 调用本机 Chrome。
  - 验证匿名管理页重定向、匿名公开页访问、editor 登录和登录后页面访问。
- 更新 `package.json`，新增 `npm run auth:browser:verify`。
- 更新 `components/layout/app-shell.tsx`：
  - `showOrganizationSwitcher=false` 时只读取未授权 Repository 上下文。
  - 修复公开页在 Supabase 登录保护开启时误触发管理端鉴权的问题。

## 当前限制

- 需要本地配置 Supabase 项目环境变量和 editor 测试账号。
- 默认临时端口为 `3300`，可通过 `HEIMA_RATINGS_AUTH_BROWSER_VERIFY_PORT` 覆盖。
- 默认使用 macOS Chrome，可通过 `HEIMA_RATINGS_BROWSER_EXECUTABLE_PATH` 覆盖。
- 当前只覆盖 editor 登录和只读页面可访问，不覆盖 viewer 写权限拒绝页面流。

## 验证记录

- `node --check scripts/verify_management_auth_browser_e2e.mjs`：通过，脚本语法无错误。
- `git diff --check`：通过，无空白格式问题。
- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run browser:verify`：通过，已自动执行 `build`、临时启动生产服务，并验证核心页面。
- `npm run auth:browser:verify`：通过，已验证匿名管理页重定向、匿名公开页访问、editor 登录和登录后管理页访问。
