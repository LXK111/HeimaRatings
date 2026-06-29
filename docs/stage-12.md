# 阶段 12：比赛工作台组件拆分

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-29 | Codex | 创建阶段 12 执行记录，记录比赛工作台组件拆分 |

## 范围

- 拆分 `components/matches/match-workbench.tsx` 的大段 JSX。
- 保持父组件继续负责数据加载、表单状态、计算流程和发布流程。
- 新增纯展示/事件组件：
  - `components/matches/match-entry-form.tsx`
  - `components/matches/match-list-panel.tsx`
  - `components/matches/ranking-control-panel.tsx`
  - `components/matches/ranking-result-table.tsx`
- 不修改 API、Repository、数据库结构和页面路由。

## 拆分边界

- `match-workbench.tsx`：保留总控状态和业务流程。
- `match-entry-form.tsx`：展示比赛录入表单，触发表单提交。
- `match-list-panel.tsx`：展示当前比赛列表。
- `ranking-control-panel.tsx`：展示计算/发布控制区、状态消息和发布快照信息。
- `ranking-result-table.tsx`：展示排名结果表格和空状态。

## 当前限制

- 子组件仍使用 props 传递较多字段，后续如果继续膨胀，可再引入局部 reducer 或自定义 hook。
- 选手、项目和武器选项仍来自现有 Mock 数据模块；管理端全面 Repository 化留到后续阶段。
- 本阶段不改变发布目标固定为 `demo` 的限制。

## 验证记录

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
