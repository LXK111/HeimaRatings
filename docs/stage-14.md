# 阶段 14：管理端页面 Repository/API 化

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-29 | Codex | 创建阶段 14 执行记录，记录管理端页面切换 Repository 数据源 |
| v0.2 | 2026-06-29 | Codex | 补充管理端页面浏览器检查结果 |

## 范围

- 将管理端页面从直接引用 `lib/mock/dashboard-data` 切换为 Repository 数据源。
- 涉及页面：
  - `/`
  - `/weapons`
  - `/players`
  - `/tournaments`
  - `/tournaments/[id]`
  - `/tournaments/[id]/events`
  - `/tournaments/[id]/matches`
  - `/tournaments/[id]/rankings`
- 将 `MatchWorkbench` 的选手、武器和比赛项目选项改为由服务端页面传入。
- 管理端 Repository 页面标记为动态渲染，避免 `next build` 依赖外部数据库。

## 非目标

- 不新增选手、武器、赛事和比赛项目 CRUD。
- 不移除 MockRepository；Mock 仍是默认本地数据源。
- 不引入多组织权限和 RLS。
- 不实现赛事编排和签表。

## 实现记录

- `app/page.tsx` 改为读取 `listWeapons()`、`listPlayers()`、`listTournaments()` 和 `getPublicRankingPage("demo")`。
- `app/weapons/page.tsx` 改为读取 `listWeapons()`。
- `app/players/page.tsx` 改为读取 `listPlayers()` 和 `listWeapons()`。
- `app/tournaments/page.tsx` 改为读取 `listTournaments()`。
- `app/tournaments/[id]/page.tsx` 改为读取赛事详情、项目、比赛和武器。
- `app/tournaments/[id]/events/page.tsx` 改为读取项目和武器。
- `app/tournaments/[id]/matches/page.tsx` 改为读取工作台初始选项并传给 `MatchWorkbench`。
- `app/tournaments/[id]/rankings/page.tsx` 改为读取当前公开页已发布排名。
- `components/matches/match-workbench.tsx` 移除对 `lib/mock/dashboard-data` 的直接依赖。

## 当前限制

- 管理端页面已读 Repository，但还没有新增/编辑/删除业务表单。
- 排名管理页当前展示公开页已发布榜单，不是独立的管理员快照管理台。
- 首页的“最近排名快照”来自公开页 payload 派生，后续可增加专门的 Repository 方法读取最新快照列表。

## 验证记录

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- 浏览器检查：通过，`/`、`/weapons`、`/players`、`/tournaments`、`/tournaments/demo`、`/tournaments/demo/events`、`/tournaments/demo/matches`、`/tournaments/demo/rankings` 均可打开且无应用错误。
