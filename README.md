# HeimaRatings

## 修改记录

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-24 | TRAE | 创建 README，记录阶段 0 工程状态 |
| v0.2 | 2026-06-24 | TRAE | 更新当前阶段、后续阶段、遗留 TODO，并补充文档记录位置提醒 |
| v0.3 | 2026-06-25 | TRAE | 将 rating-algorithm 目录移入 HeimaRatings，修改 runner 和 adapter 路径引用，使项目完全自包含 |
| v0.4 | 2026-06-25 | TRAE | 更新阶段 5 公开榜单与嵌入页发布展示闭环状态 |
| v0.5 | 2026-06-25 | TRAE | 更新阶段 6 本地验收闭环状态和验收命令 |
| v0.6 | 2026-06-25 | TRAE | 将 `verify` 调整为自启动临时生产服务的完整本地验收命令 |
| v0.7 | 2026-06-25 | TRAE | 更新阶段 7 仓储抽象与持久化边界状态 |
| v0.8 | 2026-06-25 | TRAE | 更新阶段 8 Supabase Repository 与比赛持久化状态 |
| v0.9 | 2026-06-29 | TRAE | 更新阶段 9 Supabase 真库联调验证状态 |
| v1.0 | 2026-06-29 | Codex | 更新阶段 10 排名快照发布闭环状态 |
| v1.1 | 2026-06-29 | Codex | 更新阶段 11 榜单发布操作闭环状态 |
| v1.2 | 2026-06-29 | Codex | 补充阶段 10/11 Supabase 真库验收结果 |
| v1.3 | 2026-06-29 | Codex | 更新阶段 12 比赛工作台组件拆分状态 |
| v1.4 | 2026-06-29 | Codex | 更新阶段 13 公开页多武器快照模型状态 |
| v1.5 | 2026-06-29 | Codex | 更新阶段 14 管理端页面 Repository/API 化状态 |
| v1.6 | 2026-06-29 | Codex | 更新阶段 15 多组织数据隔离基线状态 |
| v1.7 | 2026-06-29 | Codex | 更新阶段 16 数据库级多组织隔离约束状态 |
| v1.8 | 2026-06-29 | Codex | 更新阶段 17 真库组织隔离验收脚本状态 |
| v1.9 | 2026-06-29 | Codex | 更新阶段 18 认证上下文与 RLS 基础状态 |
| v2.0 | 2026-06-29 | Codex | 更新阶段 19 请求级组织上下文状态 |
| v2.1 | 2026-06-29 | Codex | 更新阶段 20 组织切换与上下文可视化状态 |
| v2.2 | 2026-06-29 | Codex | 更新阶段 21 最小 Supabase Auth 登录保护状态 |
| v2.3 | 2026-06-30 | Codex | 更新阶段 22 成员组织授权收敛状态 |
| v2.4 | 2026-06-30 | Codex | 更新阶段 23 用户 JWT Repository 与 RLS 接管状态 |
| v2.5 | 2026-06-30 | Codex | 更新阶段 24 数据库写权限 RLS 收紧状态 |
| v2.6 | 2026-06-30 | Codex | 更新阶段 25 Supabase Auth/RLS 端到端验收脚本状态 |
| v2.7 | 2026-06-30 | Codex | 更新阶段 26 管理端 API Cookie 登录态验收脚本状态 |
| v2.8 | 2026-06-30 | Codex | 更新阶段 27 武器类型真实创建编辑闭环状态 |
| v2.9 | 2026-06-30 | Codex | 更新阶段 28 选手真实创建编辑闭环状态 |
| v3.0 | 2026-06-30 | Codex | 更新阶段 29 赛事真实创建编辑闭环状态 |
| v3.1 | 2026-06-30 | Codex | 更新阶段 30 比赛项目真实创建编辑闭环状态 |
| v3.2 | 2026-06-30 | Codex | 更新阶段 31 项目参赛名单闭环状态 |
| v3.3 | 2026-06-30 | Codex | 更新阶段 32 签表生成最小闭环状态 |
| v3.4 | 2026-06-30 | Codex | 更新阶段 33 淘汰晋级最小闭环状态 |
| v3.5 | 2026-06-30 | Codex | 更新阶段 34 项目级排名闭环状态 |
| v3.6 | 2026-06-30 | Codex | 更新阶段 35 项目级排名快照展示入口状态 |
| v3.7 | 2026-07-01 | Codex | 更新阶段 36 签表可视化状态 |
| v3.8 | 2026-07-01 | Codex | 更新阶段 37 轮空与奇数晋级提示状态 |
| v3.9 | 2026-07-01 | Codex | 更新阶段 38 签表/项目排名真库验收脚本状态 |
| v4.0 | 2026-07-01 | Codex | 更新阶段 39 公开页发布目标选择状态 |

## 重要提醒：文档记录位置

当前项目的方案、阶段执行记录和代码生成变化不只记录在 README 中，主要文档位置如下：

- 工程阶段文档：`HeimaRatings/docs/`
- 阶段设计规格：`HeimaRatings/docs/superpowers/specs/`
- 总体代码生成记录与方案变化：`mydocs/HEMA排名网站代码生成记录与方案变化.md`
- 同步到 `mydocs` 的阶段文档：`mydocs/stage-*.md`
- 技术方案与选型文档：`mydocs/HEMA排名网站方案A-MVP技术方案.md`、`mydocs/HEMA排名网站技术栈选型.md`

README 只保留项目入口级摘要；阶段细节、验证记录和方案变化以 `docs/` 与 `mydocs/` 为准。

## 项目简介

HEMA Ratings 是一个 HEMA 排名网站 MVP Web 工程，用于记录赛事、比赛项目、比赛结果、选手分武器积分和排名。

当前 MVP 技术栈：

- Web：`Next.js App Router + React + TypeScript`
- 样式：`Tailwind CSS`
- API：`Next.js Route Handlers`
- 算法：通过 TypeScript Adapter 调用当前目录下已有 Python 排名算法
- 数据：默认使用 Mock Repository，可通过环境变量切换到 Supabase Repository

## 当前阶段

当前已推进到阶段 39：公开页发布目标选择。

已完成阶段：

- 阶段 0：创建 `HeimaRatings` 基础工程，完成 Next.js、TypeScript、Tailwind CSS、目录结构和首页 Mock 展示。
- 阶段 1：创建 Supabase/PostgreSQL 初始 schema、种子数据、数据库行类型和领域模型。
- 阶段 2：完成 Web UI 基础框架与页面，包含控制台、武器、选手、赛事、比赛项目、比赛录入、排名榜、公开榜单和嵌入页。
- 阶段 3：完成后端 API、Mock Repository、Ranking Engine Adapter 和 Python runner，打通 `/api/rankings/calculate` 排名计算链路。
- 阶段 4：在比赛录入页实现页面临时闭环，支持录入比赛草稿、本地追加、选择武器和算法、重新计算并展示排名结果。
- 阶段 5：实现公开榜单与嵌入页发布展示闭环，支持公开 URL、武器切换、iframe 嵌入代码和紧凑嵌入页。
- 阶段 6：新增本地 smoke check 和自启动生产服务的 `verify` 验收命令，形成本地可复现、可验证、可交付闭环。
- 阶段 7：新增 Repository 接口、MockRepository、SupabaseRepository 骨架和仓储工厂，API 与公开展示页改为通过仓储边界访问数据。
- 阶段 8：实现 Supabase Repository 基础读取、比赛写入和 Ranking Engine 输入构造，默认 Mock 模式继续可运行。
- 阶段 9：完成 Supabase 真库联调验证，核心读写链路（基础查询、比赛写入、排名计算）在 Supabase 模式下闭环。
- 阶段 10：实现排名快照写入、公开页发布 upsert 和公开榜单读取真实快照的闭环。
- 阶段 11：在比赛工作台接入“发布公开榜单”操作，让管理员可从页面发布最新排名快照。
- 阶段 12：拆分比赛工作台大组件，将录入表单、比赛列表、计算/发布控制区和排名结果表格独立成组件。
- 阶段 13：新增 `public_page_snapshots` 模型，让一个公开页可以按武器类型关联多个最新排名快照。
- 阶段 14：管理端页面改为通过 Repository 读取数据，页面层不再直接依赖 Mock 数据模块。
- 阶段 15：Supabase Repository 增加当前组织上下文，主要读写路径按组织隔离。
- 阶段 16：数据库迁移补充组织内公开页唯一约束、复合索引和跨表组织一致性 trigger。
- 阶段 17：新增真库组织隔离验收 SQL 和 `npm run db:verify` 命令。
- 阶段 18：新增组织成员表、RLS helper function、核心表 RLS policy 和 RLS 验收 SQL。
- 阶段 19：Repository 接入请求级组织上下文，API 和 Server Page 可从 header/cookie 解析当前组织。
- 阶段 20：管理端 Shell 展示当前组织来源，并支持通过 cookie 切换组织 slug。
- 阶段 21：新增 Supabase Auth email/password 登录页，管理端页面和管理 API 在 Supabase 模式下要求登录。
- 阶段 22：管理端组织上下文按 `organization_members` 授权，组织切换只展示成员组织，写入接口要求 `admin` 或 `editor`。
- 阶段 23：管理端页面和管理 API 在 Supabase 登录保护开启时使用用户会话 client 访问数据库，让 RLS 参与服务端读写路径。
- 阶段 24：数据库 RLS 写权限从“组织成员可写”收紧为“组织 admin/editor 可写”，并补充真库验证 SQL。
- 阶段 25：新增 `npm run auth:verify`，用真实 Supabase Auth viewer/editor 账号验证用户 JWT 下的 RLS 读写行为。
- 阶段 26：新增 `npm run auth:api:verify`，用 Supabase SSR cookie 验证本地 Next 管理 API 的登录态和角色权限。
- 阶段 27：武器类型管理页新增真实创建/编辑表单，`/api/weapons` 增加 POST/PATCH 写接口，并通过 Repository 持久化到当前组织。
- 阶段 28：选手管理页新增真实创建/编辑表单，`/api/players` 增加 POST/PATCH 写接口，并在创建选手时初始化已启用武器的分武器积分。
- 阶段 29：赛事管理页新增真实创建/编辑表单，`/api/tournaments` 增加 POST/PATCH 写接口，并通过 Repository 持久化赛事容器。
- 阶段 30：比赛项目管理页新增真实创建/编辑表单，`/api/tournaments/[id]/events` 增加 POST/PATCH 写接口，并通过 Repository 持久化赛事项目。
- 阶段 31：新增 `tournament_event_entries` 参赛名单模型，比赛项目页可维护参赛选手、种子序号和报名状态。
- 阶段 32：比赛项目页可基于参赛名单生成初始对阵草稿，签表结果复用 `matches` 表保存。
- 阶段 33：比赛录入页可更新已有对阵比分和胜者，并基于单败淘汰当前轮胜者生成下一轮草稿。
- 阶段 34：排名页可选择比赛项目计算项目级排名，并保存带 `event_id` 的项目级排名快照。
- 阶段 35：排名页可展示每个比赛项目最近一次项目级排名快照。
- 阶段 36：比赛录入页新增按项目和轮次展示的管理端签表视图。
- 阶段 37：签表视图可提示首轮轮空，奇数胜者晋级时阻止静默丢失未配对选手。
- 阶段 38：新增签表、比赛结果和项目级排名快照的真库约束验收，并扩展管理端 Auth/API 验收覆盖项目参赛名单、签表写权限和项目级快照写入。
- 阶段 39：比赛录入页发布公开榜单时可选择公开页目标，不再固定发布到 `demo`。

当前阶段边界：

- 默认 Mock 模式下新增比赛只保存在当前页面状态，刷新页面会丢失。
- Supabase 模式下新增比赛会通过 `SupabaseRepository` 写入 `matches` 表，并可从真库读取回显。
- Supabase 模式下排名计算从真库读取选手积分和比赛结果，调用 Python Ranking Engine 返回结果。
- `/api/rankings/calculate` 默认只计算；显式传入 `persistSnapshot: true` 时会保存 `ranking_snapshots` 和 `ranking_snapshot_items`。
- 传入 `publishPageId` 时，Supabase 模式会 upsert 对应 `public_pages` 并指向最新快照。
- 比赛工作台已区分“重新计算排名”和“发布公开榜单”；发布成功后展示快照 ID 和公开页路径。
- 比赛工作台已拆分为多个子组件，父组件继续保留业务流程控制。
- 公开榜单和嵌入榜单已具备从多个武器快照读取排名的代码路径；Supabase 真库需要先执行阶段 13 migration。
- 管理端首页、武器、选手、赛事、项目、比赛录入和排名页已切换到 Repository 数据源。
- Supabase Repository 会通过 `HEIMA_RATINGS_ORGANIZATION_SLUG` 解析当前组织，未配置时默认使用 `hema-ratings-demo`。
- Supabase 模式下武器、选手、赛事、比赛、排名计算、快照发布和公开页读取已按当前组织做应用层隔离。
- 数据库迁移已补充 `public_pages(organization_id, page_id)` 唯一约束和关键写入路径的组织一致性 trigger。
- 可通过 `DATABASE_URL="postgresql://..." npm run db:verify` 对真库组织隔离约束做事务内验收。
- 数据库侧已具备组织成员和 RLS 基础策略；管理端 Repository 在 Supabase 登录保护开启时会使用当前用户会话 client，让 RLS 参与服务端读写路径。
- 数据库 RLS 已将核心业务表写权限收紧到 `admin/editor`，`viewer` 只能读取所属组织数据。
- 管理端页面和 API 会从请求中的 `x-heima-organization-id`、`x-heima-organization-slug`、`heima_organization_id`、`heima_organization_slug` 解析期望组织；Supabase 登录保护开启时，会再按当前用户的 `organization_members` 做成员授权。
- 管理端 Shell 已提供当前组织可视化和组织 slug 切换入口；Supabase 登录保护开启时，列表只展示当前用户所属组织。
- Supabase 模式默认启用管理端登录保护；可用 `HEIMA_RATINGS_AUTH_REQUIRED=false` 临时关闭。公开榜单和嵌入页继续匿名访问。
- Supabase 模式下 `viewer` 可读管理数据；比赛写入和排名快照持久化要求当前组织角色为 `admin` 或 `editor`。
- service role Repository 仍保留给公开榜单、嵌入页、公开 API 和内部成员授权查询使用。
- 可通过 `npm run auth:verify` 使用 viewer/editor 测试账号验证 Supabase Auth JWT 和数据库 RLS 行为。
- 可通过 `npm run auth:api:verify` 使用 viewer/editor 测试账号验证管理端 API 的 Supabase SSR cookie 登录态。
- 武器类型管理页已支持新增、编辑、启停和排序，Supabase 模式下写入受当前组织 `admin/editor` 角色和数据库 RLS 约束。
- 选手管理页已支持新增和编辑基础资料，Supabase 模式下新增选手会为当前组织启用武器初始化分武器积分。
- 赛事管理页已支持新增和编辑赛事容器，可维护赛制、状态、默认算法和起止时间。
- 比赛项目管理页已支持新增和编辑项目元数据，可维护项目名称、绑定武器、赛制和状态。
- 比赛项目页已支持维护参赛名单，Supabase 真库需执行阶段 31 migration 后启用真实持久化。
- 比赛项目页已支持生成签表草稿；已有比赛时会拒绝重复生成，避免覆盖真实结果。
- 比赛录入页已支持更新已有对阵结果；单败淘汰项目可在当前轮全部完成后生成下一轮草稿。
- 比赛录入页已支持按当前项目查看轮次分组签表，展示比分、胜者、完成状态和冠军提示。
- 比赛录入页已支持首轮轮空提示；当前轮胜者数量为奇数时会阻止直接生成下一轮，完整自动轮空落位留到后续 slot 模型。
- 排名页已支持项目级排名计算、项目级快照保存和最近项目快照展示；公开页暂不展示项目级榜单。
- `npm run db:verify` 已覆盖 `matches`、`ranking_snapshots.event_id` 和 `ranking_snapshot_items` 的组织一致性约束验收。
- `npm run auth:api:verify` 已覆盖项目参赛名单读取、viewer 签表生成拒绝和 editor 项目级排名快照写入。
- 比赛录入页的公开榜单发布目标来自当前组织公开页列表；无公开页时保留 `demo` 兜底。
- 默认数据源为 Mock；Supabase 数据源已完成真库联调，并已验证页面发布后公开页和嵌入页可读取真实快照。

## 后续阶段

- 后续增强：执行阶段 13 migration 后做 Supabase 多武器公开页真库验收。
- 后续增强：完善自动轮空落位模型和浏览器自动化验收。
- 后续增强：将管理端 API Cookie 验收扩展到浏览器自动化页面流。

## 遗留 TODO

- 扩展公开页 payload，提供每个武器榜单各自的算法和生成时间。
- 增加接口测试和 Ranking Engine 输入输出回归测试。
- 部署前确认运行环境是否支持 `python3`，或将 Python Ranking Engine 独立服务化。

## 编译运行依赖环境

- **Node.js**: >= 18.18.0（Next.js 要求）
- **npm**: >= 9.0.0
- **Python 3**: >= 3.8.0（排名算法依赖，运行时需要 `python3` 命令可用）
- **数据库**: 默认无需配置（使用 Mock Repository）；Supabase 模式需要配置 Supabase PostgreSQL

## 数据源配置

默认使用 Mock 数据源：

```bash
HEIMA_RATINGS_DATA_SOURCE=mock
```

Supabase 数据源预留配置：

```bash
HEIMA_RATINGS_DATA_SOURCE=supabase
HEIMA_RATINGS_AUTH_REQUIRED=true
HEIMA_RATINGS_ORGANIZATION_SLUG=hema-ratings-demo
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Auth/RLS 端到端验收需要额外准备两个测试账号：

```bash
HEIMA_RATINGS_RLS_VIEWER_EMAIL=...
HEIMA_RATINGS_RLS_VIEWER_PASSWORD=...
HEIMA_RATINGS_RLS_EDITOR_EMAIL=...
HEIMA_RATINGS_RLS_EDITOR_PASSWORD=...
HEIMA_RATINGS_RLS_ORGANIZATION_SLUG=hema-ratings-demo
HEIMA_RATINGS_RLS_PUBLIC_PAGE_ID=demo
```

当前阶段 `supabase` 模式已实现基础读取、比赛写入、排名快照保存、公开页发布、应用层组织隔离、最小管理端登录保护、成员组织授权和管理端用户 JWT Repository；没有真实 Supabase 配置时请保持默认 Mock 模式。

## 编译运行指令

```bash
# 进入项目目录
cd HeimaRatings

# 安装 Node.js 依赖
npm install

# 开发模式运行（自动热重载）
npm run dev

# TypeScript 类型检查
npm run check

# 本地 smoke check（需要先启动 npm run dev 或 npm run start）
npm run smoke

# Supabase Auth/RLS 端到端验收（需要真库和 viewer/editor 测试账号）
npm run auth:verify

# 管理端 API Cookie 登录态验收（需要先启动本地服务）
npm run auth:api:verify

# 真库数据库约束验收（需要 psql 和 DATABASE_URL）
npm run db:verify

# 本地一键验收（会自动执行 check、build、临时 start 和 smoke）
npm run verify

# ESLint 代码检查
npm run lint

# 生产构建
npm run build

# 生产模式运行（需先执行 build）
npm run start
```

访问地址：`http://localhost:3000`

`npm run verify` 默认临时使用 `http://localhost:3100` 做生产服务验收；如端口被占用，可通过 `HEIMA_RATINGS_VERIFY_PORT=3101 npm run verify` 覆盖。

`npm run db:verify` 会优先读取当前 shell 中的 `DATABASE_URL`，也支持项目根目录下不提交的 `.env.database.local`：

```bash
DATABASE_URL="postgresql://..."
```

**注意**：排名计算功能依赖本机 `python3`；若环境中 Python 命令不是 `python3`（如 Windows 下为 `python`），需修改 `lib/ranking-engine/adapter.ts` 中的 spawn 命令。

## 关键目录

```text
HeimaRatings/
  app/                    Next.js 页面与 API 路由
  components/             UI、布局、排名榜和比赛工作台组件
  database/               数据库迁移和种子数据
  docs/                   工程阶段文档和设计规格
  lib/                    领域类型、数据库类型、服务端仓储、Ranking Engine 适配
  lib/server/repositories/ Repository 接口、Mock 实现、Supabase 实现和工厂
  lib/server/supabase/    服务端 Supabase client 初始化
  rating-algorithm/       Elo、SDR、Glicko-2、Hybrid 四种排名算法实现
  scripts/                Python Ranking Engine runner
```
