# 阶段 55：签表视图浏览器验收

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 55 执行记录，新增签表视图浏览器验收 |

## 目标

阶段 55 的目标是验证 `bracket_slots` 签表模型不只在 API 层可读，也能在真实浏览器中的管理端签表视图正确展示。

阶段 54 已经让页面优先读取 slots；如果只保留 API 验收，就无法证明用户在管理端能看到固定签位、轮空和晋级来源。本阶段把这些关键展示项纳入 Playwright 浏览器断言。

## 范围

- 复用阶段 53/54 的 Supabase 真库签表晋级验收脚本。
- 使用真实 viewer/editor Supabase Auth 测试账号。
- 创建临时组织、临时赛事、三人单败项目和参赛名单。
- 通过 editor 生成初始签表、完成首轮比赛并生成下一轮。
- 验证管理端页面展示：
  - 第 1 轮和第 2 轮。
  - 固定 slot 编号。
  - 轮空 slot。
  - 晋级 slot。
  - 来源比赛文本。
- 验证 editor 和 viewer 都能读取签表页面；viewer 的晋级写操作仍被拒绝。

## 非目标

- 不新增 slot 编辑能力。
- 不调整签表视觉设计。
- 不改变 RLS policy。
- 不改变数据库 schema。

## 实现记录

- 更新 `scripts/verify_supabase_bracket_slots_advancement.mjs`，引入 Playwright 浏览器验收。
- 脚本为浏览器上下文写入 Supabase Auth cookies 和 `heima_organization_slug` cookie。
- 浏览器验收直接访问临时赛事的 `/tournaments/[id]/matches` 页面。
- 浏览器断言覆盖 `Slot 1`、`轮空`、`晋级`、来源比赛、轮次和轮空选手展示。
- 更新 `README.md` 当前阶段、已完成阶段、验收命令说明和后续阶段。
- 更新 `docs/HEMA排名网站代码生成记录与方案变化.md`，记录阶段 55。

## 验证记录

- `node --check scripts/verify_supabase_bracket_slots_advancement.mjs`：通过，脚本语法无错误。
- `npm run bracket:slots:advance:verify`：通过，真库验证 slots API、editor/viewer 浏览器签表读取、viewer 晋级拒绝和临时数据清理。
- `npm run check`：通过，TypeScript 类型检查无错误。
- `git diff --check`：通过，当前变更无空白格式问题。

## 边界与后续

- 当前阶段只验证签表只读展示，不提供页面编辑 slot。
- 阶段 56 和阶段 57 已标记为部署后交互业务优化项。
- 部署前主线下一步建议推进阶段 58：真实数据导入/初始化工具。
