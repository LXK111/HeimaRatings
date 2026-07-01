# 阶段 40：浏览器自动化页面流验收

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 40 执行记录，新增浏览器自动化页面流验收 |

## 范围

- 新增浏览器自动化验收命令。
- 使用生产构建和临时本地服务验证核心页面可打开。
- 覆盖管理端首页、武器、选手、赛事、比赛项目、比赛录入、排名页。
- 覆盖公开榜单页和嵌入页。
- 验证比赛录入页存在“发布目标”选择控件。
- 捕获页面运行时错误和浏览器 console error。

## 非目标

- 不覆盖真实 Supabase 登录页面流。
- 不录入真实表单数据。
- 不新增 Playwright 测试目录和多浏览器矩阵。
- 不改变业务功能。

## 实现记录

- 新增 `scripts/verify_browser_pages.mjs`：
  - 执行 `npm run build`。
  - 启动临时 `next start` 服务。
  - 使用 Playwright 调用本机 Chrome 打开核心页面。
  - 对页面关键文本做可见性断言。
  - 对比赛录入页的“发布目标”下拉框做控件断言。
  - 检查页面错误和 console error。
- 更新 `package.json`：
  - 新增 `@playwright/test` devDependency。
  - 新增 `npm run browser:verify`。
- 更新 `app/layout.tsx` 和 `public/favicon.svg`：
  - 补充站点图标，避免浏览器自动请求 favicon 产生 404 console error。

## 当前限制

- 默认使用 macOS Chrome：`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`。
- 可通过 `HEIMA_RATINGS_BROWSER_EXECUTABLE_PATH` 指定其他浏览器路径。
- 默认临时端口为 `3200`，可通过 `HEIMA_RATINGS_BROWSER_VERIFY_PORT` 覆盖。
- 当前只验证 Mock 模式页面流，真库登录态浏览器流留到后续阶段。

## 验证记录

- `node --check scripts/verify_browser_pages.mjs`：通过，脚本语法无错误。
- `git diff --check`：通过，无空白格式问题。
- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run browser:verify`：通过，已自动执行 `build`、临时启动生产服务，并验证核心页面。
