# HEMA 排名网站代码生成记录与方案变化

## 修改记录

| 版本 | 日期 | 修改人 | 修改内容 |
|------|------|--------|----------|
| v0.1 | 2026-06-24 | TRAE | 创建代码生成记录文档，记录 MVP 开发推进方式、阶段计划和阶段 0 准备事项 |
| v0.2 | 2026-06-24 | TRAE | 根据 PRD 反馈补充多武器类型积分、分武器排名、赛事多比赛项目模型 |
| v0.3 | 2026-06-24 | TRAE | 执行阶段 0，创建 `HeimaRatings` 基础工程、目录分层、首页 Mock 展示和 README |
| v0.4 | 2026-06-24 | TRAE | 完成阶段 0 验证，安装依赖，修复 `postcss` 审计项，验证 TypeScript 与生产构建通过 |
| v0.5 | 2026-06-24 | TRAE | 执行阶段 1，创建数据库迁移、种子数据、数据库行类型和完整领域模型 |
| v0.6 | 2026-06-24 | TRAE | 完成阶段 1 验证，TypeScript 检查和 Next.js 生产构建通过 |
| v0.7 | 2026-06-24 | TRAE | 使用 `frontend-design` 推进阶段 2，创建管理端外壳、通用组件、Mock 数据和页面路由骨架 |
| v0.8 | 2026-06-24 | TRAE | 完成阶段 2 验证，TypeScript 检查和 Next.js 生产构建通过 |
| v0.9 | 2026-06-24 | TRAE | 执行阶段 3，创建后端 API、服务端 Mock Repository、Ranking Engine 适配层和 Python runner |
| v1.0 | 2026-06-24 | TRAE | 完成阶段 3 验证，TypeScript、生产构建、基础 API 和 Ranking Engine 计算链路通过 |
| v1.1 | 2026-06-24 | TRAE | 执行阶段 4，创建比赛录入与排名计算页面临时闭环 |
| v1.2 | 2026-06-24 | TRAE | 完成阶段 4 验证，比赛录入页面、API 和 Ranking Engine 闭环通过 |
| v1.3 | 2026-06-25 | TRAE | 执行阶段 5，创建公开榜单与嵌入页发布展示闭环 |
| v1.4 | 2026-06-25 | TRAE | 完成阶段 5 验证，公开 API、公开页和嵌入页通过 |
| v1.5 | 2026-06-25 | TRAE | 执行阶段 6，新增本地 smoke check 和 verify 验收命令 |
| v1.6 | 2026-06-25 | TRAE | 完成阶段 6 验证，`verify` 改为自启动生产服务并通过完整本地验收 |
| v1.7 | 2026-06-25 | TRAE | 执行阶段 7，新增仓储抽象、Mock 实现、Supabase 骨架和仓储工厂 |
| v1.8 | 2026-06-25 | TRAE | 完成阶段 7 验证，Repository 默认 Mock 数据源下 smoke 和 verify 通过 |
| v1.9 | 2026-06-25 | TRAE | 执行阶段 8，实现 Supabase Repository 基础读取、比赛写入和 Ranking Engine 输入构造 |
| v2.0 | 2026-06-25 | TRAE | 完成阶段 8 验证，补齐 API 统一错误响应和 Supabase 缺配置错误路径 |
| v2.1 | 2026-06-29 | TRAE | 完成阶段 9 Supabase 真库联调验证 |
| v2.2 | 2026-06-29 | Codex | 执行阶段 10，实现排名快照保存与公开页发布闭环 |
| v2.3 | 2026-06-29 | Codex | 执行阶段 11，在比赛工作台接入公开榜单发布操作 |
| v2.4 | 2026-06-29 | Codex | 完成阶段 10/11 Supabase 真库发布验收 |
| v2.5 | 2026-06-29 | Codex | 执行阶段 12，拆分比赛工作台大组件 |
| v2.6 | 2026-06-29 | Codex | 执行阶段 13，新增公开页多武器快照模型 |
| v2.7 | 2026-06-29 | Codex | 执行阶段 14，管理端页面切换 Repository 数据源 |
| v2.8 | 2026-06-29 | Codex | 执行阶段 15，建立 Supabase Repository 多组织数据隔离基线 |
| v2.9 | 2026-06-29 | Codex | 执行阶段 16，补充数据库级多组织隔离约束 |
| v3.0 | 2026-06-29 | Codex | 执行阶段 17，新增真库组织隔离验收脚本 |
| v3.1 | 2026-06-29 | Codex | 执行阶段 18，新增组织成员与 RLS 基础策略 |

## 1. 文档目的

本文档用于在 HEMA Ratings MVP 开发全过程中，简要记录：

- 每一步执行的方案细节。
- 代码生成、目录创建、配置变更记录。
- 与原技术方案相比发生的调整。
- 每个阶段的产出和验证结果。

每次推进新阶段时，需要在“修改记录”中追加版本，并在对应阶段下补充执行记录。

## 2. 当前采用方案

当前采用 `mydocs/HEMA排名网站方案A-MVP技术方案.md` 中的方案 A：

- Web 应用：`Next.js App Router + React + TypeScript`
- 样式：`Tailwind CSS`
- 组件：后续接入 `shadcn/ui`
- 数据库：后续接入 `Supabase PostgreSQL`
- 后端：后续使用 `Next.js Route Handlers`
- 算法层：后续通过 `Ranking Engine Adapter` 复用当前 Python 算法
- 部署：后续使用 `Vercel + Supabase`
- 关键业务模型：选手需要支持多个武器类型下的独立积分、排名和比赛记录；单个赛事可以包含多个比赛项目，每个项目绑定一个武器类型。

## 3. 代码管理位置

代码统一在以下目录生成和管理：

```text
/Users/bytedance/Desktop/myProject/HeimaRatings
```

模块需要按文件夹区分，初始规划：

```text
HeimaRatings/
  app/
  components/
  lib/
  docs/
  public/
```

## 4. 分阶段执行记录

### 阶段 0：项目初始化与工程规范

方案细节：

- 创建 `HeimaRatings` Web 工程。
- 使用 `Next.js + TypeScript + Tailwind CSS` 作为基础。
- 初始化基础页面和全局样式。
- 建立模块目录边界，后续分别承载 UI、业务类型、Ranking Engine 适配层和文档。
- 暂不接入 Supabase、API、Python 算法和真实业务数据。

计划生成内容：

- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `tailwind.config.ts`
- `postcss.config.mjs`
- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
- `components/`
- `lib/`
- `docs/`

代码生成记录：

- 已保留并更新 `HeimaRatings/README.md`。
- 已创建 `HeimaRatings/package.json`，配置 `dev`、`build`、`start`、`lint`、`check` 脚本。
- 已创建 `HeimaRatings/next.config.ts`、`tsconfig.json`、`next-env.d.ts`。
- 已创建 `HeimaRatings/tailwind.config.ts`、`postcss.config.mjs`、`app/globals.css`。
- 已创建 `HeimaRatings/app/layout.tsx` 和 `HeimaRatings/app/page.tsx`。
- 已创建 `HeimaRatings/components/layout/stat-card.tsx`。
- 已创建 `HeimaRatings/components/ui/status-badge.tsx`。
- 已创建 `HeimaRatings/lib/domain/types.ts`，预留多武器类型、选手分武器积分、赛事、排名快照类型。
- 已创建 `HeimaRatings/lib/mock/dashboard-data.ts`，提供阶段 0 首页 Mock 数据。
- 已创建 `HeimaRatings/docs/stage-0.md`，记录阶段 0 范围。
- 已创建 `HeimaRatings/.gitignore`，忽略依赖、构建产物、环境变量和 TypeScript 增量缓存。
- 已生成 `HeimaRatings/package-lock.json` 和 `node_modules`。
- 已在 `package.json` 中使用 `overrides.postcss` 固定 `postcss >= 8.5.10`，避免 `next` 嵌套依赖触发中等级别审计项。

验证记录：

- `npm install`：通过。
- `npm audit --omit=dev`：通过，0 vulnerabilities。
- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。

方案变化：

- 相比技术方案原文，本次明确第一步只执行“阶段 0：项目初始化与工程规范”。
- `HeimaRatings` 作为唯一 Web 工程目录。
- PRD 已调整为多武器类型模型，后续数据类型与页面导航需要预留 `weapons`、`tournament_events`、`player_weapon_ratings` 等模块。
- 阶段 0 首页使用 Mock 数据呈现多武器积分池与排名快照，不接入真实 API 和 Supabase。

### 阶段 1：数据库与基础数据模型

方案细节：

- 固化多武器类型积分池模型。
- 选手基础信息与选手分武器积分拆表管理。
- 单个赛事可以包含多个 `tournament_events`，每个项目绑定一个 `weapon_type`。
- 比赛记录同时归属于赛事、项目和武器类型。
- 排名快照按赛事、武器类型、算法保存，支持后续公开榜单引用。
- 本阶段只生成 SQL、类型与说明文档，不连接真实 Supabase 项目。

代码生成记录：

- 已创建 `HeimaRatings/database/migrations/202606240001_initial_schema.sql`。
- 已创建 `HeimaRatings/database/seeds/202606240001_seed_core_data.sql`。
- 已扩展 `HeimaRatings/lib/domain/types.ts`，覆盖组织、武器类型、选手、分武器积分、赛事、比赛项目、比赛、排名快照和 Ranking Engine 输入输出。
- 已创建 `HeimaRatings/lib/database/types.ts`，定义 Supabase/PostgreSQL 返回的 snake_case 行类型。
- 已创建 `HeimaRatings/docs/stage-1.md`，记录阶段 1 范围、核心表、执行方式和限制。

验证记录：

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- Supabase 只读 API 验证：通过，`/api/weapons`、`/api/players`、`/api/tournaments`、`/api/public/rankings/demo` 均返回 200。
- `npm run build`：通过，Next.js 生产构建成功。

方案变化：

- 相比阶段 0，新增 `database/` 与 `lib/database/` 模块。
- 当前不引入 Supabase SDK，避免在未配置真实 Supabase 项目前增加运行时依赖。
- 数据库迁移包含 `check` 约束、唯一约束和常用索引，便于后续 API 直接复用。

### 阶段 2：Web UI 基础框架与页面

方案细节：

- 使用 `frontend-design` 技能确定 UI 方向：“HEMA 赛场裁判台 + 金属武器库”。
- 阶段 2 只实现静态/Mock 数据页面，不接入 Supabase、API、Ranking Engine。
- 使用统一 `AppShell` 管理导航、标题和页面说明。
- 使用通用 `Panel`、`DataTable`、`ActionLink`、`StatusBadge` 承载页面信息密度。
- 公开榜单和嵌入榜单独立成页面，验证后续对外发布路径。

代码生成记录：

- 已创建 `HeimaRatings/components/layout/app-shell.tsx`。
- 已创建 `HeimaRatings/components/ui/panel.tsx`。
- 已创建 `HeimaRatings/components/ui/data-table.tsx`。
- 已创建 `HeimaRatings/components/ui/action-link.tsx`。
- 已创建 `HeimaRatings/components/rankings/ranking-board.tsx`。
- 已扩展 `HeimaRatings/lib/domain/types.ts`，增加 `TournamentEventSummary`、`MatchSummary`、`RankingRow`。
- 已扩展 `HeimaRatings/lib/mock/dashboard-data.ts`，增加 `tournamentEvents`、`matches`、`rankingsByWeapon`。
- 已改造 `HeimaRatings/app/page.tsx` 使用统一外壳和通用组件。
- 已创建 `HeimaRatings/app/weapons/page.tsx`。
- 已创建 `HeimaRatings/app/players/page.tsx`。
- 已创建 `HeimaRatings/app/tournaments/page.tsx`。
- 已创建 `HeimaRatings/app/tournaments/[id]/page.tsx`。
- 已创建 `HeimaRatings/app/tournaments/[id]/events/page.tsx`。
- 已创建 `HeimaRatings/app/tournaments/[id]/matches/page.tsx`。
- 已创建 `HeimaRatings/app/tournaments/[id]/rankings/page.tsx`。
- 已创建 `HeimaRatings/app/public/rankings/[pageId]/page.tsx`。
- 已创建 `HeimaRatings/app/embed/rankings/[pageId]/page.tsx`。
- 已创建 `HeimaRatings/docs/stage-2.md`。

验证记录：

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功，已生成阶段 2 多页面路由。

方案变化：

- 阶段 2 先并排展示多个武器排名榜，后续阶段再实现真实的武器切换交互。
- 当前导航中的示例赛事使用 `/tournaments/demo` 作为静态展示入口，后续接入真实赛事 ID。

### 阶段 3：后端 API 与 Ranking Engine 封装

方案细节：

- 使用 Next.js Route Handlers 承载 MVP API。
- 先使用 `Mock Repository` 读取阶段 2 Mock 数据，后续替换为 Supabase Repository。
- 通过 TypeScript `Ranking Engine Adapter` 统一调用排名算法。
- 通过 `scripts/ranking_engine_runner.py` 使用 `importlib` 动态加载当前目录下已有 Python 算法。
- `/api/rankings/calculate` 支持两种模式：完整请求体计算，或无请求体时使用 Mock 数据计算。

代码生成记录：

- 已创建 `HeimaRatings/scripts/ranking_engine_runner.py`。
- 已创建 `HeimaRatings/lib/ranking-engine/adapter.ts`。
- 已创建 `HeimaRatings/lib/server/api-response.ts`。
- 已创建 `HeimaRatings/lib/server/mock-repository.ts`。
- 已创建 `HeimaRatings/app/api/weapons/route.ts`。
- 已创建 `HeimaRatings/app/api/players/route.ts`。
- 已创建 `HeimaRatings/app/api/tournaments/route.ts`。
- 已创建 `HeimaRatings/app/api/tournaments/[id]/route.ts`。
- 已创建 `HeimaRatings/app/api/tournaments/[id]/events/route.ts`。
- 已创建 `HeimaRatings/app/api/tournaments/[id]/matches/route.ts`。
- 已创建 `HeimaRatings/app/api/rankings/calculate/route.ts`。
- 已创建 `HeimaRatings/app/api/rankings/[snapshotId]/route.ts`。
- 已创建 `HeimaRatings/app/api/public/rankings/[pageId]/route.ts`。
- 已创建 `HeimaRatings/docs/stage-3.md`。

验证记录：

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功，已生成新增 API 动态路由。
- `GET /api/weapons`：通过，返回武器类型列表。
- `GET /api/tournaments/demo/events`：通过，返回示例赛事项目列表。
- `POST /api/rankings/calculate`：通过，使用 `hybrid` 算法和长剑 Mock 数据调用 Python Ranking Engine，返回排名结果。

方案变化：

- 阶段 3 不直接连接 Supabase，避免未配置项目时阻塞开发。
- API 响应统一包裹为 `{ data }` 或 `{ error }`。
- Ranking Engine 当前依赖本机 `python3`，部署前需要在运行环境确认 Python 可用或改为独立服务。

### 阶段 4：比赛录入与排名计算闭环

方案细节：

- 采用页面临时闭环，不在阶段 4 接入 Supabase 或保存排名快照。
- 初始比赛通过 `/api/tournaments/[id]/matches` 加载。
- 新增比赛调用 `POST /api/tournaments/[id]/matches` 做服务端校验，并追加到页面本地状态。
- 排名计算由页面组装完整 `RankingEngineInput` 后调用 `/api/rankings/calculate`。
- 计算结果只展示在当前页面，不覆盖静态 Mock 排名快照。

代码生成记录：

- 已创建 `HeimaRatings/docs/superpowers/specs/2026-06-24-stage-4-match-ranking-loop-design.md`。
- 已同步设计文档到 `mydocs/2026-06-24-stage-4-match-ranking-loop-design.md`。
- 已创建 `HeimaRatings/components/matches/match-workbench.tsx`。
- 已改造 `HeimaRatings/app/tournaments/[id]/matches/page.tsx`，接入客户端工作台。
- 已更新 `HeimaRatings/lib/server/mock-repository.ts`，补强比赛草稿校验。
- 已创建 `HeimaRatings/docs/stage-4.md`。

验证记录：

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `POST /api/tournaments/demo/matches`：通过，返回比赛草稿。
- `POST /api/rankings/calculate`：通过，返回 `hybrid` 算法排名结果。
- 页面验证：`/tournaments/demo/matches` 可正常渲染并触发重新计算，页面展示成功提示和排名结果。

方案变化：

- 阶段 4 明确不做数据持久化，目的是先验证“比赛录入影响排名结果”的最短闭环。
- 阶段 5 再考虑将本地状态替换为 Supabase Repository，并保存 `ranking_snapshots`。

### 阶段 5：公开榜单与嵌入页

方案细节：

- 采用发布展示闭环，不在阶段 5 接入 Supabase、不实时计算公开榜单、不保存新快照。
- 公开 API 返回页面配置、多武器榜单、公开链接、嵌入链接和 iframe 代码。
- 公开页支持武器切换、发布状态展示、公开链接和 iframe 代码展示。
- 嵌入页支持通过 `weapon` query 指定武器，并使用紧凑只读布局。

代码生成记录：

- 已创建 `HeimaRatings/docs/superpowers/specs/2026-06-25-stage-5-public-ranking-publish-design.md`。
- 已同步设计文档到 `mydocs/2026-06-25-stage-5-public-ranking-publish-design.md`。
- 已扩展 `HeimaRatings/lib/domain/types.ts`，新增 `PublicRankingPagePayload`。
- 已更新 `HeimaRatings/lib/server/mock-repository.ts`，扩展公开榜单 payload。
- 已更新 `HeimaRatings/app/api/public/rankings/[pageId]/route.ts`，支持公开页不存在时返回 404。
- 已改造 `HeimaRatings/app/public/rankings/[pageId]/page.tsx`。
- 已改造 `HeimaRatings/app/embed/rankings/[pageId]/page.tsx`。
- 已创建 `HeimaRatings/docs/stage-5.md`。

验证记录：

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `/api/public/rankings/demo`：通过，返回公开发布 payload。
- `/api/public/rankings/missing`：通过，返回 404。
- `/public/rankings/demo?weapon=weapon-sabre`：通过，页面包含发布状态和 iframe 嵌入代码。
- `/embed/rankings/demo?weapon=weapon-sabre`：通过，页面包含军刀榜单数据。
- `/public/rankings/demo?weapon=bad`：通过，页面可回退展示公开榜单。

方案变化：

- 阶段 5 只验证“对外发布和嵌入形态”，不解决真实持久化和实时计算。
- 后续接入 Supabase 后，可用真实 `public_pages` 和 `ranking_snapshots` 替换 Mock Repository。

### 阶段 6：测试、部署与验收

方案细节：

- 采用本地验收闭环，不在阶段 6 引入测试框架或真实云部署平台。
- 使用 Node 原生能力实现 smoke check。
- `npm run smoke` 验证本地服务关键 API 和运行时依赖。
- `npm run verify` 串联 TypeScript 检查、生产构建、临时生产服务和 smoke check。

代码生成记录：

- 已创建 `HeimaRatings/docs/superpowers/specs/2026-06-25-stage-6-local-acceptance-design.md`。
- 已同步设计文档到 `mydocs/2026-06-25-stage-6-local-acceptance-design.md`。
- 已创建 `HeimaRatings/scripts/smoke_check.mjs`。
- 已创建 `HeimaRatings/scripts/verify_local.mjs`。
- 已更新 `HeimaRatings/package.json`，新增 `smoke` 和 `verify` 脚本。
- 已创建 `HeimaRatings/docs/stage-6.md`。
- 已同步阶段文档到 `mydocs/stage-6.md`。
- 已更新 `HeimaRatings/README.md` 和 `mydocs/README.md`。

验证记录：

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `npm run smoke`：通过，已验证 `node`、`npm`、`python3`、武器 API、赛事 API、Ranking Engine 和公开榜单 API。
- `npm run verify`：通过，已自动执行 `check`、`build`，临时启动 `http://localhost:3100`，执行 smoke check 并关闭临时服务。

方案变化：

- 阶段 6 明确只做本地可复现、可验证、可交付闭环。
- 原 `verify = check && build && smoke` 会依赖外部 dev server 状态；为避免 `next build` 刷新 `.next` 后旧服务读取不一致产物，改为 `verify_local.mjs` 自启动临时生产服务。
- 自动化测试框架、真实云部署、Supabase 持久化仍作为后续增强。

### 阶段 7：仓储抽象与持久化边界

方案细节：

- 采用仓储抽象优先，先让 API 和公开展示页不再直接依赖 Mock 数据文件。
- 默认数据源仍为 Mock，保证当前本地运行和验收不回退。
- 新增 Supabase 数据源骨架和环境变量校验，为后续真实读写做准备。
- 当前阶段不连接真实 Supabase，不引入登录、权限、RLS 或复杂赛事编排。

代码生成记录：

- 已创建 `HeimaRatings/docs/superpowers/specs/2026-06-25-stage-7-repository-abstraction-design.md`。
- 已同步设计文档到 `mydocs/2026-06-25-stage-7-repository-abstraction-design.md`。
- 已创建 `HeimaRatings/lib/server/repositories/types.ts`。
- 已创建 `HeimaRatings/lib/server/repositories/mock.ts`。
- 已创建 `HeimaRatings/lib/server/repositories/supabase.ts`。
- 已创建 `HeimaRatings/lib/server/repositories/factory.ts`。
- 已迁移 API 路由到 `getRepository()`。
- 已迁移公开榜单页和嵌入榜单页到 `getRepository()`。
- 已创建 `HeimaRatings/docs/stage-7.md`。
- 已同步阶段文档到 `mydocs/stage-7.md`。
- 已更新 `HeimaRatings/README.md` 和 `mydocs/README.md`。

验证记录：

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `npm run smoke`：通过，已验证 Repository 工厂默认 Mock 数据源下的关键 API、Ranking Engine 和公开榜单 API。
- `npm run verify`：通过，已自动执行 `check`、`build`，临时启动 `http://localhost:3100`，执行 smoke check 并关闭临时服务。

方案变化：

- 原先 API 与公开展示页直接依赖 `mock-repository.ts`；阶段 7 改为依赖 `AppRepository` 接口。
- `mock-repository.ts` 暂时保留为 Mock 实现的内部兼容层，避免一次性重写 Mock 数据逻辑。
- Supabase 模式只完成骨架，不在本阶段承诺真实查询和写入。

### 阶段 8：Supabase Repository 与比赛持久化

方案细节：

- 采用 Supabase Repository 代码实现 + Mock 默认运行。
- 默认数据源仍为 Mock，保证本地开发和 `npm run verify` 不依赖真实 Supabase 项目。
- Supabase 模式实现基础读取、比赛写入和 Ranking Engine 输入构造。
- 阶段 8 只写入 `matches`，不保存 `ranking_snapshots`，保持事实数据和正式发布快照隔离。

代码生成记录：

- 已创建 `HeimaRatings/docs/superpowers/specs/2026-06-25-stage-8-supabase-repository-persistence-design.md`。
- 已同步设计文档到 `mydocs/2026-06-25-stage-8-supabase-repository-persistence-design.md`。
- 已安装 `@supabase/supabase-js`。
- 已创建 `HeimaRatings/lib/server/supabase/client.ts`。
- 已实现 `HeimaRatings/lib/server/repositories/supabase.ts` 的基础读取、比赛写入、Ranking Engine 输入构造和公开页基础查询。
- 已更新 `HeimaRatings/components/matches/match-workbench.tsx` 比赛提交成功提示。
- 已创建 `HeimaRatings/docs/stage-8.md`。
- 已同步阶段文档到 `mydocs/stage-8.md`。
- 已更新 `HeimaRatings/README.md` 和 `mydocs/README.md`。
- 已为仓储读取类 API 增加统一服务端错误响应，避免 Supabase 缺配置时返回空 500。

验证记录：

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- `npm run smoke`：通过，使用默认 Mock 数据源验证关键 API、Ranking Engine 和公开榜单 API。
- Supabase 缺配置错误路径：通过，API 返回包含缺失环境变量说明的 JSON 错误响应。

方案变化：

- Supabase 模式从阶段 7 的骨架升级为可执行的数据访问实现。
- Mock 模式仍是默认模式，避免缺少 Supabase 环境变量时影响本地验收。
- 排名快照保存和公开榜单真实快照读取仍留到阶段 9。

### 阶段 9：Supabase 真库联调验证

方案细节：

- 在 Supabase 真库执行初始 migration 和 seed。
- 配置 `.env.local` 切换为 `HEIMA_RATINGS_DATA_SOURCE=supabase`。
- 验证基础读取 API、比赛写入 API 和 Ranking Engine 从真库取数计算。
- 公开榜单 API 因 `public_pages` 未 seed 返回 404，作为后续阶段处理项。

文档记录：

- 已创建 `HeimaRatings/docs/stage-9.md`。
- 已更新 `HeimaRatings/README.md` 当前阶段为阶段 9。

验证记录：

- `GET /api/weapons`：通过，返回 4 种武器。
- `GET /api/players`：通过，返回 3 名选手。
- `GET /api/tournaments`：通过，返回 1 个赛事。
- `GET /api/tournaments/demo/events`：通过，返回 2 个赛事项目。
- `GET /api/tournaments/demo/matches`：通过。
- `POST /api/tournaments/demo/matches`：通过，比赛写入 `matches`。
- `POST /api/rankings/calculate`：通过，返回真库数据计算结果。
- `GET /api/public/rankings/demo`：404，符合当时预期。

方案变化：

- 阶段 9 实际承担真库联调，不再同时推进快照保存和公开页真实快照读取。
- 快照发布闭环顺延到阶段 10。

### 阶段 10：排名快照发布闭环

方案细节：

- 阶段 10 的本质是把一次排名计算固化为可发布数据，而不是继续扩展展示页面。
- `/api/rankings/calculate` 默认仍只计算；显式传入 `persistSnapshot: true` 才写入快照。
- 传入 `publishPageId` 时，Supabase Repository upsert `public_pages` 并指向最新快照。
- 为避免客户端 Mock ID 污染真库，持久化路径强制由服务端 Repository 构造 Ranking Engine 输入。

代码生成记录：

- 已更新 `HeimaRatings/lib/server/repositories/types.ts`，为 `CreateRankingSnapshotInput` 增加 `publishPageId`。
- 已实现 `HeimaRatings/lib/server/repositories/supabase.ts` 的 `createRankingSnapshot()`。
- 已更新 `HeimaRatings/app/api/rankings/calculate/route.ts`，支持 `persistSnapshot` 和 `publishPageId`。
- 已更新 `HeimaRatings/database/seeds/202606240001_seed_core_data.sql`，补充 `public_pages` demo seed。
- 已创建 `HeimaRatings/docs/stage-10.md`。
- 已更新 `HeimaRatings/README.md` 当前阶段和遗留事项。

验证记录：

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- 浏览器检查：通过，管理端首页、武器、选手、赛事、赛事详情、比赛项目、比赛录入和排名页均可打开且无应用错误。
- `npm run smoke`：通过，新增覆盖 `persistSnapshot: true` 的 `ranking snapshot publish` 分支。
- Supabase 真库验收：通过，写入长剑比赛、生成快照 `4fb80375-67bb-4ec6-9d88-0e7c40a9f551`、读回 3 条快照明细、公开 API 返回长剑 3 条排名。
- 公开页和嵌入页真库验收：通过，`/public/rankings/demo?weapon=weapon-longsword` 与 `/embed/rankings/demo?weapon=weapon-longsword` 均返回 200 并展示榜首选手。

方案变化：

- 公开页和嵌入页不新增新路由，继续通过 Repository 读取公开榜单 payload。
- 阶段 10 先提供 API 级发布能力，比赛工作台按钮留到后续阶段。

### 阶段 11：榜单发布操作闭环

方案细节：

- 阶段 11 的本质是把阶段 10 的 API 级发布能力变成管理员可操作的产品闭环。
- 比赛工作台保留“重新计算排名”作为临时试算动作。
- 新增“发布公开榜单”作为正式动作，调用 `/api/rankings/calculate` 并传入 `persistSnapshot: true` 和 `publishPageId: "demo"`。
- 发布成功后页面展示快照 ID、生成时间和公开页路径，帮助管理员确认已发布版本。

代码生成记录：

- 已更新 `HeimaRatings/components/matches/match-workbench.tsx`：
  - 新增发布响应类型、发布状态和快照状态。
  - 新增 `publishRankings()`。
  - 新增“发布公开榜单”按钮。
  - 修正比赛录入提示，区分 Supabase 写库和 Mock 页面状态。
  - 发布成功后用服务端返回结果刷新当前排名展示。
- 已创建 `HeimaRatings/docs/stage-11.md`。
- 已更新 `HeimaRatings/README.md` 当前阶段和遗留事项。

验证记录：

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- Supabase 页面操作验收：通过，比赛工作台可点击“重新计算排名”和“发布公开榜单”，发布后页面展示“公开榜单已发布”和 `/public/rankings/demo`。

方案变化：

- 发布目标暂时固定为 `demo` 公开页，后续再做多公开页选择。
- 阶段 11 不拆分大组件，优先完成可操作闭环。

### 阶段 12：比赛工作台组件拆分

方案细节：

- 阶段 12 的目标是降低 `match-workbench.tsx` 的 JSX 和展示职责，而不是改变业务行为。
- 父组件继续负责状态、API 调用、Ranking Engine 输入构造和发布流程。
- 子组件只负责展示 UI 和把用户动作回传给父组件。

代码生成记录：

- 已新增 `HeimaRatings/components/matches/match-entry-form.tsx`。
- 已新增 `HeimaRatings/components/matches/match-list-panel.tsx`。
- 已新增 `HeimaRatings/components/matches/ranking-control-panel.tsx`。
- 已新增 `HeimaRatings/components/matches/ranking-result-table.tsx`。
- 已更新 `HeimaRatings/components/matches/match-workbench.tsx`，改为组合子组件。
- 已创建 `HeimaRatings/docs/stage-12.md`。
- 已更新 `HeimaRatings/README.md` 当前阶段和遗留事项。

验证记录：

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。

方案变化：

- 不引入全局状态管理或 reducer，避免为拆分组件扩大行为变化面。
- 管理端全面 Repository/API 化仍留到后续阶段。

### 阶段 13：公开页多武器快照模型

方案细节：

- 阶段 13 解决 `public_pages.snapshot_id` 只能表达单个快照的问题。
- 新增 `public_page_snapshots` 映射表，按 `public_page_id + weapon_type_id` 记录每个武器的最新公开快照。
- 旧字段 `public_pages.snapshot_id` 保留为兼容字段。
- 公开页 payload 的 `rankingsByWeapon` 保持不变，降低公开页和嵌入页改造面。

代码生成记录：

- 已新增 `HeimaRatings/database/migrations/202606290001_public_page_snapshots.sql`。
- 已更新 `HeimaRatings/lib/database/types.ts`，新增 `PublicPageSnapshotRow`。
- 已更新 `HeimaRatings/lib/server/repositories/supabase.ts`：
  - 发布快照时 upsert `public_page_snapshots`。
  - 读取公开页时优先读取映射表中的多个武器快照。
  - 映射为空时回退旧 `public_pages.snapshot_id`。
- 已创建 `HeimaRatings/docs/stage-13.md`。
- 已更新 `HeimaRatings/README.md` 当前阶段和遗留事项。

验证记录：

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- Supabase 真库多武器验收：当前环境缺少 `DATABASE_URL` 和 `psql`，待手动执行 migration 后验证。

方案变化：

- 本阶段先不扩展 payload 的 per-weapon metadata，公开页仍使用页面级 `algorithm` 和 `generatedAt`。
- 管理端全面 Repository/API 化仍留到后续阶段。

### 阶段 14：管理端页面 Repository/API 化

方案细节：

- 阶段 14 的目标是移除页面层对 `lib/mock/dashboard-data` 的直接依赖。
- Server 页面直接通过 `getRepository()` 读取数据。
- `MatchWorkbench` 仍保留客户端交互，但选手、武器和项目选项由服务端页面传入。
- Repository 页面标记为动态渲染，避免生产构建依赖外部数据库连接。

代码生成记录：

- 已更新 `HeimaRatings/app/page.tsx`。
- 已更新 `HeimaRatings/app/weapons/page.tsx`。
- 已更新 `HeimaRatings/app/players/page.tsx`。
- 已更新 `HeimaRatings/app/tournaments/page.tsx`。
- 已更新 `HeimaRatings/app/tournaments/[id]/page.tsx`。
- 已更新 `HeimaRatings/app/tournaments/[id]/events/page.tsx`。
- 已更新 `HeimaRatings/app/tournaments/[id]/matches/page.tsx`。
- 已更新 `HeimaRatings/app/tournaments/[id]/rankings/page.tsx`。
- 已更新 `HeimaRatings/components/matches/match-workbench.tsx`，移除 Mock 数据 import。
- 已创建 `HeimaRatings/docs/stage-14.md`。
- 已更新 `HeimaRatings/README.md` 当前阶段和遗留事项。

验证记录：

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。

方案变化：

- 排名管理页暂时展示当前公开页已发布榜单；独立快照管理台留到后续阶段。
- MockRepository 仍保留为默认数据源实现，不再由页面直接引用。

### 阶段 15：多组织数据隔离基线

方案细节：

- 阶段 15 的目标是让 Supabase Repository 的读写入口先具备组织边界。
- 当前组织通过 `HEIMA_RATINGS_ORGANIZATION_SLUG` 解析，未配置时默认 `hema-ratings-demo`。
- 先做应用层隔离，避免在未接入认证前引入不完整权限模型。
- 后续再推进数据库复合唯一约束、RLS 和用户登录上下文。

代码生成记录：

- 已更新 `HeimaRatings/lib/server/repositories/supabase.ts`：
  - 新增当前组织解析和缓存。
  - 武器、选手、赛事列表按当前组织过滤。
  - 赛事、比赛项目、比赛录入、排名计算输入和快照创建增加组织归属校验。
  - 公开页读取和创建按 `organization_id + page_id` 定位。
  - 多武器公开页发布时校验武器属于当前组织。
- 已创建 `HeimaRatings/docs/stage-15.md`。
- 已更新 `HeimaRatings/README.md` 当前阶段、环境变量和后续阶段边界。

验证记录：

- `npm run check`：通过，TypeScript 无错误。

方案变化：

- 多组织隔离先落在 Repository 边界，而不是直接新增登录系统。
- `public_pages.page_id` 仍是全局唯一，后续需要迁移为组织内唯一。

### 阶段 16：数据库级多组织隔离约束

方案细节：

- 阶段 16 的目标是把阶段 15 的应用层组织隔离下沉为数据库不变量。
- `public_pages.page_id` 不再全局唯一，改为组织内唯一。
- 对当前 MVP 的核心写入路径增加 trigger，阻止跨组织错绑。
- 本阶段仍不做 RLS 和认证，权限系统留到后续阶段。

代码生成记录：

- 已新增 `HeimaRatings/database/migrations/202606290002_organization_integrity_constraints.sql`。
- 已更新 `HeimaRatings/database/migrations/202606240001_initial_schema.sql`，让新库直接使用 `public_pages(organization_id, page_id)` 唯一约束。
- 已更新 `HeimaRatings/database/seeds/202606240001_seed_core_data.sql`，公开页 seed 改为按 `(organization_id, page_id)` upsert。
- 已创建 `HeimaRatings/docs/stage-16.md`。
- 已更新 `HeimaRatings/README.md` 当前阶段和后续阶段边界。

验证记录：

- `git diff --check`：通过，无空白格式问题。
- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- 真库 DDL 执行：已由用户在 Supabase 真库手动执行阶段 16 migration。

方案变化：

- 多组织隔离从 Repository 边界推进到数据库一致性边界。
- RLS、认证上下文和组织切换仍留到后续阶段。

### 阶段 17：真库组织隔离验收脚本

方案细节：

- 阶段 17 的目标是让阶段 16 的数据库约束可以被重复验收。
- 使用 SQL 事务内临时数据验证正向写入和负向失败路径。
- `rollback` 结束验证，避免污染真库业务数据。
- 通过 `npm run db:verify` 封装 `psql` 调用。

代码生成记录：

- 已新增 `HeimaRatings/database/validations/202606290003_verify_organization_integrity.sql`。
- 已新增 `HeimaRatings/scripts/verify_database_constraints.mjs`。
- `db:verify` 支持读取项目根目录下不提交的 `.env.database.local`。
- 已更新 `HeimaRatings/package.json`，新增 `db:verify` 脚本。
- 已创建 `HeimaRatings/docs/stage-17.md`。
- 已更新 `HeimaRatings/README.md` 当前阶段、运行命令和阶段边界。

验证记录：

- `git diff --check`：通过，无空白格式问题。
- `npm run db:verify` 缺配置路径：通过，未配置 `DATABASE_URL` 时明确提示。
- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- 真库 `db:verify`：已由用户在本地数据库连接环境执行成功。

方案变化：

- 真库验证从人工 SQL 检查升级为可重复执行的事务内验收脚本。
- 本阶段仍不引入 RLS、认证上下文或 Supabase CLI。

### 阶段 18：认证上下文与 RLS 基础

方案细节：

- 阶段 18 的目标是为后续 Supabase Auth 和用户级组织上下文建立数据库基础。
- 新增 `organization_members`，表达用户与组织的成员关系和角色。
- 先在数据库侧启用 RLS policy，现有服务端 Repository 仍走 service role，避免打断当前 MVP。
- `db:verify` 改为顺序执行全部 validation SQL，后续新增数据库验收无需改脚本。

代码生成记录：

- 已新增 `HeimaRatings/database/migrations/202606290003_auth_rls_foundation.sql`。
- 已新增 `HeimaRatings/database/validations/202606290004_verify_auth_rls_foundation.sql`。
- 已更新 `HeimaRatings/scripts/verify_database_constraints.mjs`，支持顺序执行多份 validation SQL。
- 已更新 `HeimaRatings/lib/database/types.ts`，新增 `OrganizationMemberRow`。
- 已创建 `HeimaRatings/docs/stage-18.md`。
- 已更新 `HeimaRatings/README.md` 当前阶段和后续阶段边界。

验证记录：

- `git diff --check`：通过，无空白格式问题。
- `DATABASE_URL= npm run db:verify` 缺配置路径：通过，未配置连接串时明确提示。
- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- 真库 RLS migration 和新增 validation：已由用户在本地数据库连接环境执行 `npm run db:verify` 验收通过。

方案变化：

- 多组织隔离从“应用层过滤 + 数据库一致性约束”继续推进到“数据库访问策略基础”。
- 登录 UI、用户 JWT Repository 和组织切换仍留到后续阶段。
