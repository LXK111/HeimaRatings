# 阶段 47：管理端行内编辑表单权限验收

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 47 执行记录，扩展管理端行内编辑表单权限验收 |

## 目标

阶段 47 的目标是把 Supabase 浏览器权限验收从新增表单扩展到列表行内编辑表单。

新增和编辑不是同一条权限路径。新增验证 `INSERT`，编辑验证 `UPDATE`，而 Supabase RLS 下 `UPDATE` 还依赖对应行可被当前用户 `SELECT` 到。因此本阶段单独覆盖行内“保存”按钮，确认 editor 能编辑，viewer 不能编辑。

## 范围

- editor 行内编辑：
  - 武器类型编辑保存。
  - 选手编辑保存。
  - 赛事编辑保存。
  - 比赛项目编辑保存。
  - 项目参赛名单种子编辑保存。
- viewer 行内编辑拒绝：
  - 武器类型编辑被拒绝。
  - 选手编辑被拒绝。
  - 赛事编辑被拒绝。
  - 比赛项目编辑被拒绝。
  - 项目参赛名单编辑被拒绝。

## 非目标

- 不新增 UI。
- 不新增 RLS 策略。
- 不清理 editor 创建和编辑的测试数据。
- 不覆盖删除、批量编辑或签表结果编辑。

## 实现记录

- 更新 `scripts/verify_management_auth_browser_e2e.mjs`：
  - 在 editor 新增管理数据后，继续对同一批数据执行行内编辑保存。
  - 在 viewer 拒绝新增表单后，继续尝试编辑同一批行并断言被拒绝。
  - 新增 `submitInlineEditForm()`，通过真实列表行、真实输入框和“保存”按钮提交 Server Action。
  - 新增 `submitEntryInlineEditForm()`，覆盖项目参赛名单行内编辑。

## 验证记录

- `node --check scripts/verify_management_auth_browser_e2e.mjs`：通过，脚本语法无错误。
- `npm run check`：通过，TypeScript 无错误。
- `npm run auth:browser:verify`：通过，已验证 editor 行内编辑保存和 viewer 行内编辑拒绝。

## 边界与后续

- viewer 编辑拒绝在 Next.js 生产 Server Action 中会表现为 500 响应和 RLS/空结果错误日志，这是预期验收信号。
- 后续可继续补 Ranking Engine 输入输出回归测试，尤其是轮空不进入比赛输入的断言。
