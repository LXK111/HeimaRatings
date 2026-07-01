# 阶段 42：viewer 浏览器权限拒绝验收

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 42 执行记录，新增 viewer 浏览器权限拒绝验收 |

## 范围

- 扩展 Supabase 管理端登录态浏览器验收。
- 使用真实 viewer 测试账号通过登录表单进入管理端。
- 验证 viewer 登录后可以读取武器管理页。
- 验证 viewer 在浏览器会话中调用排名快照写入口会返回 403。
- 保留匿名管理页重定向、匿名公开页访问和 editor 登录访问验收。

## 非目标

- 不新增 UI 权限态展示。
- 不执行真实管理表单写入。
- 不创建或修改 Supabase Auth 用户。
- 不修改数据库 RLS。

## 实现记录

- 更新 `scripts/verify_management_auth_browser_e2e.mjs`：
  - 新增 viewer 测试账号配置读取。
  - 将匿名、viewer、editor 分成独立 browser context，避免 cookie 串扰。
  - 新增 viewer 登录后读取管理页的断言。
  - 新增 viewer 通过浏览器 `fetch` 调用 `/api/rankings/calculate` 持久化快照被 403 拒绝的断言。
  - 对预期的 403 浏览器 console 噪声做定向豁免，其他 console error 仍然失败。

## 当前限制

- viewer 写权限拒绝通过 API 写入口断言，不通过页面表单提交断言。
- 当前只覆盖排名快照写入口，其他写入口页面流留到后续阶段。
- 需要本地配置 viewer/editor 测试账号环境变量。

## 验证记录

- `node --check scripts/verify_management_auth_browser_e2e.mjs`：通过，脚本语法无错误。
- `git diff --check`：通过，无空白格式问题。
- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run browser:verify`：通过，已自动执行 `build`、临时启动生产服务，并验证核心页面。
- `npm run auth:browser:verify`：通过，已验证匿名管理页重定向、匿名公开页访问、viewer 只读写拒绝、editor 登录和登录后管理页访问。
