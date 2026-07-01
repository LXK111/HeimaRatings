# 阶段 46：更多管理端真实表单权限验收

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 46 执行记录，扩展管理端真实表单权限验收 |

## 目标

阶段 46 的目标是把 viewer/editor 权限边界从比赛录入表单扩展到更多管理端真实表单。

权限验收的本质不是直接调用 API，而是确认用户在真实页面点击按钮时，Server Action、Repository、Supabase 用户会话和 RLS 组合后仍保持同一条边界：editor 可以写，viewer 不能写。

## 范围

- editor 真实表单写入：
  - 新增武器类型。
  - 新增选手。
  - 新增赛事。
  - 新增比赛项目。
  - 新增项目参赛名单。
- viewer 真实表单拒绝：
  - 新增武器类型被拒绝。
  - 新增选手被拒绝。
  - 新增赛事被拒绝。
  - 新增比赛项目被拒绝。
  - 新增项目参赛名单被拒绝。
- 保留阶段 43 已有比赛录入表单和排名快照写拒绝验收。

## 非目标

- 不新增 UI。
- 不新增 RLS 策略。
- 不清理 editor 创建的管理端测试数据。
- 不覆盖所有编辑表单的 PATCH/UPDATE 变体。

## 实现记录

- 更新 `scripts/verify_management_auth_browser_e2e.mjs`：
  - editor 先登录并创建真实管理数据，为 viewer 参赛名单拒绝验收提供可用项目。
  - 新增 `verifyEditorManagementForms()` 覆盖管理端新增表单。
  - 新增 `verifyViewerManagementFormDenials()` 覆盖 viewer 表单拒绝。
  - 新增通用 `submitCreateForm()`、`submitEntryForm()` 和 Server Action 响应断言。
  - 对 viewer 被 RLS 拒绝时产生的预期生产模式 Server Component page error 和 500 console error 做定向豁免。

## 验证记录

- `node --check scripts/verify_management_auth_browser_e2e.mjs`：通过，脚本语法无错误。
- `npm run auth:browser:verify`：通过，已验证匿名访问、editor 多表单写入、viewer 排名快照/比赛录入/多管理表单写拒绝。

## 边界与后续

- 本阶段覆盖新增表单，不覆盖每个列表行内编辑表单。
- viewer 拒绝路径在 Next.js 生产 Server Action 中会表现为 500 响应和 RLS 错误日志，这是预期验收信号。
- 后续可继续补武器、选手、赛事、项目和参赛名单的编辑表单权限验收。
