# 阶段 43：真实表单提交路径浏览器权限验收

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 43 执行记录，新增真实比赛表单提交路径的浏览器权限验收 |

## 目标

阶段 43 的目标是把 Supabase 登录态浏览器验收从“浏览器内 API 调用”推进到“用户真实页面表单操作”。

阶段 42 已证明 viewer 在浏览器会话中无法写入排名快照，但那条路径仍是脚本直接 `fetch`。真实风险来自用户点击页面按钮时，前端表单、API 鉴权、Repository 和 RLS 是否共同保持角色边界。因此本阶段优先覆盖比赛录入页的真实“保存比赛”表单。

## 范围

- 保留匿名管理页重定向验收。
- 保留匿名公开页访问验收。
- 保留 viewer 登录后可读管理页验收。
- 保留 viewer 浏览器会话直接写排名快照返回 403 的验收。
- 新增 viewer 在比赛录入页点击“保存比赛”时被拒绝的验收。
- 新增 editor 在比赛录入页点击“保存比赛”并成功保存的验收。

## 非目标

- 不新增业务 UI。
- 不新增数据库表或 RLS 策略。
- 不处理自动轮空落位模型。
- 不清理验收过程中 editor 创建的真实比赛记录。

## 实现记录

- 更新 `scripts/verify_management_auth_browser_e2e.mjs`：
  - 抽出 `signIn()`，统一 viewer/editor 浏览器登录流程。
  - 新增 `submitMatchForm()`，通过页面 label 和按钮完成真实比赛表单提交。
  - 新增 `selectFirstTwoPlayers()`，确保比赛表单使用两个不同选手。
  - editor 路径验证表单提交成功并出现“比赛已保存并加入当前计算队列。”。
  - viewer 路径验证表单提交被拒绝并出现“Organization editor or admin role required”。

## 验证记录

- `node --check scripts/verify_management_auth_browser_e2e.mjs`：通过，脚本语法无错误。
- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run browser:verify`：通过，已自动执行 `build`、临时启动生产服务，并验证核心页面。
- `npm run auth:browser:verify`：通过，已验证匿名管理页重定向、匿名公开页访问、viewer 只读写拒绝、viewer 真实表单写拒绝和 editor 真实表单写入。
- `git diff --check`：通过，无空白格式问题。

## 边界与后续

- 本阶段选择比赛录入页作为第一条真实表单写入路径，因为它已连接真实比赛写入 API，且 viewer/editor 角色差异明确。
- `npm run auth:browser:verify` 会在 Supabase 真库中新增 editor 测试比赛记录；当前项目暂不提供验收数据自动回滚。
- 后续可继续补武器、选手、赛事、比赛项目等管理表单的浏览器写权限验收。
