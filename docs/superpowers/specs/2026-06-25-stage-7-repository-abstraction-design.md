# 阶段 7：仓储抽象与持久化边界设计

## 修改记录

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-25 | TRAE | 创建阶段 7 设计规格，确认采用仓储抽象优先方案 |
| v0.2 | 2026-06-25 | TRAE | 自检后补充公开页和嵌入页也需通过仓储读取公开榜单 |

## 目标

阶段 7 的目标是把 HEMA Ratings 从“页面和 API 直接依赖 Mock 数据”推进到“业务代码依赖统一仓储接口”。本阶段先建立稳定的数据访问边界，使后续接入 Supabase 时不需要重写页面和 API 路由。

核心问题是：同一套 API 和页面能否在 Mock 数据和 Supabase 数据之间切换，同时保持比赛录入、排名计算、快照保存和公开榜单读取的业务边界清晰。

## 范围

- 新增仓储接口，统一描述当前 API 需要的数据访问能力。
- 将现有 Mock 数据访问封装为 `MockRepository`。
- 新增 `SupabaseRepository` 骨架和环境变量约定。
- 新增 `getRepository()` 工厂，集中决定当前运行时使用 Mock 还是 Supabase。
- 将 API 路由改为依赖仓储接口，不再直接依赖 `mock-repository.ts`。
- 将公开榜单页和嵌入榜单页改为通过仓储读取公开榜单 payload。
- 为后续“比赛写库、排名快照保存、公开榜单读真实快照”预留方法边界。
- 更新阶段文档、README 和 `mydocs` 总记录。

## 非目标

- 不要求连接真实 Supabase 项目。
- 不引入登录、权限、RLS 策略或多用户会话。
- 不把所有 Mock 数据一次性迁移为真实数据库数据。
- 不改页面 UI。
- 不实现复杂赛事编排、签表和自动晋级。
- 不新增完整测试框架，仍使用现有 `npm run verify` 做本地验收。

## 推荐方案

采用仓储抽象优先：

- API 路由和公开展示页只调用仓储接口，不关心数据来自 Mock 还是 Supabase。
- Mock 实现保持当前页面和 smoke check 可用，作为默认运行模式。
- Supabase 实现先提供结构化骨架，只有配置环境变量并显式开启时才启用。
- 持久化能力按业务动作设计，而不是按数据库表裸露 CRUD。

这个方案的原因是：当前 MVP 最大缺口不是 UI，也不是算法，而是数据边界。先抽象仓储可以最小化对现有功能的扰动，同时为真实数据闭环铺路。

## 仓储接口设计

新增 `lib/server/repositories/types.ts`，定义仓储接口和输入类型。

核心读取方法：

- `listWeapons()`
- `listPlayers()`
- `listTournaments()`
- `getTournament(id)`
- `listTournamentEvents(tournamentId)`
- `listTournamentMatches(tournamentId)`
- `getRankingSnapshot(snapshotId)`
- `getPublicRankingPage(pageId)`

核心写入与计算准备方法：

- `createMatch(tournamentId, input)`
- `buildRankingEngineInput(options)`
- `createRankingSnapshot(input, output)`

输入类型应表达业务语义：

- `CreateMatchInput` 使用选手名称、项目 ID、轮次和比分，兼容当前比赛录入页。
- `BuildRankingEngineInputOptions` 使用赛事 ID、武器 ID、算法和可选项目 ID。
- `CreateRankingSnapshotInput` 使用 Ranking Engine 输出结果和计算上下文。

## 实现分层

### `MockRepository`

职责：

- 复用当前 `lib/mock/dashboard-data.ts`。
- 保持现有 demo 页面、API 和 smoke check 行为不变。
- `createMatch()` 仍返回草稿式结果，不写入真实持久化存储。
- `createRankingSnapshot()` 可返回内存构造结果或显式声明 Mock 模式不持久化。

### `SupabaseRepository`

职责：

- 使用已有 `database/migrations/202606240001_initial_schema.sql` 的表结构作为目标模型。
- 封装 Supabase client 初始化。
- 初期先实现类型、方法签名和环境变量校验。
- 未配置 Supabase 时抛出明确错误，不影响默认 Mock 模式。

环境变量约定：

- `HEIMA_RATINGS_DATA_SOURCE=mock | supabase`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

默认值为 `mock`，避免新环境运行失败。

### `getRepository()`

职责：

- 读取 `HEIMA_RATINGS_DATA_SOURCE`。
- 默认返回 `MockRepository`。
- 当值为 `supabase` 时返回 `SupabaseRepository`。
- 对未知值抛出明确配置错误。

## API 改造范围

需要从直接 import `mock-repository.ts` 改为通过 `getRepository()` 获取仓储：

- `app/api/weapons/route.ts`
- `app/api/players/route.ts`
- `app/api/tournaments/route.ts`
- `app/api/tournaments/[id]/route.ts`
- `app/api/tournaments/[id]/events/route.ts`
- `app/api/tournaments/[id]/matches/route.ts`
- `app/api/rankings/[snapshotId]/route.ts`
- `app/api/rankings/calculate/route.ts`
- `app/api/public/rankings/[pageId]/route.ts`

公开榜单页和嵌入榜单页需要同步迁移到仓储接口，因为它们是对外发布能力的一部分。其他管理端页面暂不迁移，优先保持现有页面渲染稳定。

需要从直接 import `mock-repository.ts` 改为通过 `getRepository()` 获取仓储的服务端页面：

- `app/public/rankings/[pageId]/page.tsx`
- `app/embed/rankings/[pageId]/page.tsx`

## 数据流

比赛写入数据流：

1. 比赛录入页提交比赛结果。
2. `POST /api/tournaments/[id]/matches` 调用 `repository.createMatch()`。
3. Mock 模式返回草稿比赛，Supabase 模式后续写入 `matches`。
4. 页面继续使用返回结果更新当前状态。

排名计算数据流：

1. `POST /api/rankings/calculate` 读取算法、赛事、武器和可选项目。
2. 如果请求体是完整 `RankingEngineInput`，保持直接计算能力。
3. 如果请求体不是完整输入，调用 `repository.buildRankingEngineInput()`。
4. Ranking Engine 返回结果。
5. 阶段 7 可预留 `persistSnapshot` 开关，但默认不保存快照。

公开榜单数据流：

1. `GET /api/public/rankings/[pageId]` 调用 `repository.getPublicRankingPage()`。
2. Mock 模式保持当前 demo payload。
3. Supabase 模式后续读取 `public_pages`、`ranking_snapshots` 和 `ranking_snapshot_items`。

## 错误处理

- 未找到资源返回 404。
- 输入不合法返回 400。
- Supabase 模式缺少环境变量时返回明确服务端错误。
- Repository 工厂不吞掉配置错误，避免误以为已连接真库。
- Mock 模式与 Supabase 模式返回相同领域类型，避免 API 响应形态分裂。

## 验收标准

- `npm run check` 通过。
- `npm run build` 通过。
- `npm run smoke` 通过。
- `npm run verify` 通过。
- 默认不配置 Supabase 时，现有页面和 API 行为保持不变。
- API 路由、公开榜单页和嵌入榜单页不再直接依赖 `mock-repository.ts`。
- `SupabaseRepository` 在环境变量缺失时给出明确错误。

## 文档更新

- 新增 `docs/stage-7.md`。
- 同步新增 `mydocs/stage-7.md`。
- 更新 `README.md` 与 `mydocs/README.md`：
  - 当前阶段推进到阶段 7。
  - 说明默认数据源仍为 Mock。
  - 补充 Supabase 环境变量约定。
- 更新 `mydocs/HEMA排名网站代码生成记录与方案变化.md`。

## 后续衔接

- 阶段 8 可接入真实 Supabase 项目并实现真库读写。
- 阶段 9 可保存真实 `ranking_snapshots` 并让公开榜单读取最新快照。
- 阶段 10 可引入登录、组织隔离、权限和 RLS。
