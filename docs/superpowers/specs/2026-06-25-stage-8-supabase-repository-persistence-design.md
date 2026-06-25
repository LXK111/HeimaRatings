# 阶段 8：Supabase Repository 与比赛持久化设计

## 修改记录

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-25 | TRAE | 创建阶段 8 设计规格，确认采用 Supabase Repository 代码实现、默认 Mock 运行方案 |
| v0.2 | 2026-06-25 | TRAE | 自检后统一比赛录入页提示策略，避免扩大 API 响应形态 |

## 目标

阶段 8 的目标是把阶段 4 的“页面临时比赛状态”升级为可接入真实数据库的“比赛持久化路径”。本阶段实现 Supabase Repository 的核心读写代码，让 `HEIMA_RATINGS_DATA_SOURCE=supabase` 时具备从 Supabase 读取基础数据、写入比赛记录、并基于数据库比赛构造 Ranking Engine 输入的能力。

本阶段不要求当前机器已经配置真实 Supabase 项目。默认仍使用 Mock 数据源，保证本地开发、构建和 `npm run verify` 不被外部云配置阻塞。

## 范围

- 新增 Supabase server client 初始化模块。
- 新增 `@supabase/supabase-js` 依赖。
- 实现 `SupabaseRepository` 的核心读取方法。
- 实现 `SupabaseRepository.createMatch()`，将比赛写入 `matches` 表。
- 实现 `SupabaseRepository.buildRankingEngineInput()`，基于数据库选手积分和比赛记录构造算法输入。
- 保持 `MockRepository` 默认运行路径不变。
- 调整比赛录入页提示文案，使用不依赖数据源的中性保存提示。
- 更新阶段文档、README 和 `mydocs` 总记录。

## 非目标

- 不保存 `ranking_snapshots`。
- 不改造公开榜单读取真实快照。
- 不引入登录、权限、RLS 或多用户会话。
- 不引入 Supabase CLI、本地 Supabase 容器或自动迁移命令。
- 不要求在本阶段完成真实 Supabase 联调。
- 不改 UI 布局和设计风格。

## 推荐方案

采用“Supabase Repository 代码实现 + Mock 默认运行”：

- `HEIMA_RATINGS_DATA_SOURCE` 默认仍为 `mock`。
- 配置为 `supabase` 时才初始化 Supabase client。
- Supabase Repository 使用 service role key 运行在服务端 Route Handler 中，不暴露到客户端。
- 比赛录入页仍调用现有 API，不直接接触 Supabase。
- API 通过阶段 7 的 `AppRepository` 接口切换数据源。

这个方案的原因是：阶段 8 的本质是补上真实持久化路径，而不是把整个应用切到云服务。先实现服务端数据层，可以在没有 Supabase 密钥时继续稳定开发；等环境准备好后，只需要切换环境变量即可进入真库联调。

## 数据源配置

默认 Mock：

```bash
HEIMA_RATINGS_DATA_SOURCE=mock
```

Supabase：

```bash
HEIMA_RATINGS_DATA_SOURCE=supabase
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` 只允许服务端读取，不在客户端组件中使用。

## Supabase Client 设计

新增 `lib/server/supabase/client.ts`：

- 读取 `NEXT_PUBLIC_SUPABASE_URL`。
- 读取 `SUPABASE_SERVICE_ROLE_KEY`。
- 缺失配置时抛出明确错误。
- 使用 `createClient()` 创建服务端 Supabase client。

不新增浏览器端 Supabase client，因为阶段 8 所有持久化都通过 Next.js Route Handlers 完成。

## Repository 实现设计

### 读取基础数据

实现以下方法：

- `listWeapons()` 读取 `weapon_types`，按 `sort_order` 排序。
- `listPlayers()` 读取 `players`，并关联 `player_weapon_ratings` 组装 `PlayerSummary`。
- `listTournaments()` 读取 `tournaments`，并统计 `tournament_events` 和 `matches` 数量。
- `getTournament(id)` 支持真实 UUID，也支持 `demo` 映射到种子赛事 ID。
- `listTournamentEvents(tournamentId)` 读取指定赛事下的项目。
- `listTournamentMatches(tournamentId)` 读取指定赛事下比赛，并关联双方选手名称和胜者名称。
- `getRankingSnapshot(snapshotId)` 读取快照和快照条目；如果无数据返回明确错误。
- `getPublicRankingPage(pageId)` 可先实现基础查询结构，但真实快照发布仍留到阶段 9。

### 写入比赛

`createMatch(tournamentId, input)` 的流程：

1. 解析 `tournamentId`，支持 `demo` 映射。
2. 根据 `eventId` 查询 `tournament_events`，获得 `weapon_type_id`。
3. 根据 `player1Name` 和 `player2Name` 在同组织内查询选手。
4. 校验双方存在且不同。
5. 校验轮次和比分。
6. 根据比分计算 `winner_id`，平局则为 `null`。
7. 插入 `matches`。
8. 返回 `MatchSummary`。

### 构造 Ranking Engine 输入

`buildRankingEngineInput(options)` 的流程：

1. 解析赛事 ID、武器 ID、算法和可选项目 ID。
2. 从 `player_weapon_ratings` 读取该武器下选手初始积分、RD、sigma。
3. 从 `matches` 读取该赛事和武器下比赛记录。
4. 按 `round` 分组并排序。
5. 返回 `RankingEngineInput`。

## 页面状态设计

阶段 4 当前页面在提交成功后把返回比赛追加到本地 `matches` 状态，这是合理的前端显示状态，但不是数据源真相。

阶段 8 保持这个前端状态更新方式：

- 提交成功后，页面继续将返回比赛追加到本地 `matches` 状态。
- 页面提示统一为“比赛已保存并加入当前计算队列”。
- 文档明确说明：Mock 模式不是真实持久化，Supabase 模式才写入数据库。

为避免客户端直接读取服务端环境变量，阶段 8 不新增轻量 API，也不在比赛提交响应中返回数据源 metadata：

- 推荐在 `MatchSummary` 外包一层响应 metadata 会扩大现有 API 形态，不采用。
- 本阶段更小改动：在 `POST /api/tournaments/[id]/matches` 成功响应中继续返回 `MatchSummary`，页面提示改为中性文案“比赛已保存并加入当前计算队列”。Mock 文档中说明 Mock 不是真实持久化。

## 快照隔离

阶段 8 只写入 `matches`，不写入 `ranking_snapshots`。

原因：

- 比赛记录是事实数据。
- 排名快照是发布数据。
- 两者生命周期不同，必须隔离，避免每次页面临时计算都污染正式公开榜单。

`createRankingSnapshot()` 继续保留接口，但真实保存留到阶段 9。

## 种子数据与 ID 映射

现有种子数据使用固定 UUID，但 Mock 数据使用 `tournament-001`、`weapon-longsword` 等字符串 ID。

阶段 8 需要显式处理 demo 映射：

- `demo` 和 `tournament-001` 映射到 `30000000-0000-0000-0000-000000000001`。
- `weapon-longsword` 映射到 `10000000-0000-0000-0000-000000000001`。
- `weapon-sabre` 映射到 `10000000-0000-0000-0000-000000000002`。
- `weapon-rapier` 映射到 `10000000-0000-0000-0000-000000000003`。
- `event-longsword-open` 映射到 `40000000-0000-0000-0000-000000000001`。
- `event-sabre-open` 映射到 `40000000-0000-0000-0000-000000000002`。

这样可以让现有页面 URL 和表单选项在 Supabase 模式下仍能工作。

## 错误处理

- 环境变量缺失：返回明确服务端错误，提示 Supabase 未配置。
- 选手不存在：返回 400。
- 项目不存在：返回 400。
- 比分、轮次非法：返回 400。
- Supabase 查询失败：抛出包含操作名称的错误，避免只看到泛化失败。
- 默认 Mock 模式不因 Supabase 缺失而失败。

## 验收标准

默认 Mock 模式：

- `npm run check` 通过。
- `npm run build` 通过。
- `npm run smoke` 通过。
- `npm run verify` 通过。

Supabase 代码路径：

- TypeScript 编译通过。
- `HEIMA_RATINGS_DATA_SOURCE=supabase` 且缺少环境变量时给出明确错误。
- 配置 Supabase 环境后，`POST /api/tournaments/demo/matches` 具备写入 `matches` 的代码路径。

## 文档更新

- 新增 `docs/stage-8.md`。
- 同步新增 `mydocs/stage-8.md`。
- 更新 `README.md` 与 `mydocs/README.md`：
  - 当前阶段推进到阶段 8。
  - 补充 Supabase 依赖和环境变量说明。
  - 说明默认 Mock、Supabase 可切换。
- 更新 `mydocs/HEMA排名网站代码生成记录与方案变化.md`。

## 后续衔接

- 阶段 9：保存真实 `ranking_snapshots`，公开榜单读取最新快照。
- 阶段 10：登录、组织隔离、权限和 RLS。
- 阶段 11：赛事编排、签表、自动晋级和项目级发布工作流。
