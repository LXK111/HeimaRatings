# HEMA 排名网站方案 A MVP 技术方案

## 修改记录

| 版本 | 日期 | 修改人 | 修改内容 |
|------|------|--------|----------|
| v0.1 | 2026-06-24 | TRAE | 初版，输出方案 A MVP 技术方案、分步需求与执行步骤 |

## 1. 背景与目标

HEMA 排名网站 MVP 采用方案 A：`Next.js + TypeScript + Tailwind CSS + shadcn/ui + Supabase + Python Ranking Engine`。

本方案目标是快速完成一个可用的 Web 端排名系统，并为后续对外发布排名能力打好基础：

- 记录选手、赛事、比赛结果和比分。
- 基于当前已有四种算法计算积分和排名。
- 展示内部管理页面、公开榜单页面和可嵌入榜单页面。
- 保留当前 Python 算法资产，避免 MVP 阶段过早重写算法。
- 通过统一 API 和 Ranking Engine 抽象，为后续外部业务接入、组件化发布、SaaS 化扩展预留边界。

## 2. MVP 范围

### 2.1 本期包含

- 选手管理：创建、编辑、查看选手基础信息和初始积分。
- 赛事管理：创建赛事、查看赛事详情、维护赛事状态。
- 比赛录入：按赛事和轮次录入对阵双方、比分和比赛结果。
- 排名计算：支持 `Elo`、`SDR`、`Glicko-2`、`SDR + Glicko-2 融合算法`。
- 默认算法：融合算法 `hybrid`。
- 排名展示：展示积分、排名、胜负场、算法来源和更新时间。
- 算法对比：在同一赛事下对比四种算法的排名差异。
- 公开榜单：为赛事或俱乐部生成只读公开排名页面。
- 嵌入榜单：提供适合 iframe 的榜单页面。
- 数据导入：兼容当前 `players` 与 `matches` JSON 结构。

### 2.2 本期不包含

- 不做复杂多租户权限体系，只预留 `organization_id`。
- 不做支付、计费、商业化套餐。
- 不做完整组件库发布。
- 不做算法 TypeScript 全量迁移。
- 不做移动端 App。
- 不做实时多人协作编辑。

## 3. 技术架构总览

```text
HEMA 管理员 / 公开访问用户 / 外部业务页面
        |
        v
Next.js App Router Web 应用
        |
        +-- 管理端页面
        +-- 公开榜单页面
        +-- iframe 嵌入页面
        |
        v
Next.js Route Handlers API
        |
        +-- 选手 API
        +-- 赛事 API
        +-- 比赛 API
        +-- 排名计算 API
        +-- 公开榜单 API
        |
        v
Ranking Engine Adapter
        |
        +-- Elo Python 算法
        +-- SDR Python 算法
        +-- Glicko-2 Python 算法
        +-- Hybrid Python 算法
        |
        v
Supabase PostgreSQL
        |
        +-- organizations
        +-- players
        +-- tournaments
        +-- matches
        +-- ranking_snapshots
        +-- ranking_snapshot_items
        +-- public_pages
```

## 4. 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| Web 框架 | `Next.js App Router` | 页面、路由、SSR、API 层 |
| 语言 | `TypeScript` | 前后端类型统一 |
| UI 框架 | `React` | 页面与组件开发 |
| 样式 | `Tailwind CSS` | 快速构建响应式样式 |
| 组件库 | `shadcn/ui` | 表单、表格、弹窗、卡片等基础 UI |
| 表格 | `TanStack Table` | 选手表、比赛表、排名榜 |
| 图表 | `Recharts` | 积分趋势、算法差异可视化 |
| 表单 | `React Hook Form + Zod` | 表单状态管理和输入校验 |
| 数据库 | `Supabase PostgreSQL` | 业务数据、排名快照、公开页面配置 |
| 认证 | `Supabase Auth` | MVP 可先启用邮箱登录，或预留接口 |
| 后端 API | `Next.js Route Handlers` | MVP 服务端接口 |
| 算法层 | `Python Ranking Engine` | 复用现有四种 Python 算法 |
| 部署 | `Vercel + Supabase` | 低成本快速上线 |

## 5. 目录结构建议

```text
hema-ranking-web/
  app/
    page.tsx
    players/
      page.tsx
    tournaments/
      page.tsx
      [id]/
        page.tsx
        matches/
          page.tsx
        rankings/
          page.tsx
    public/
      rankings/
        [pageId]/
          page.tsx
    embed/
      rankings/
        [pageId]/
          page.tsx
    api/
      players/
        route.ts
      tournaments/
        route.ts
      tournaments/
        [id]/
          route.ts
        [id]/
          matches/
            route.ts
      rankings/
        calculate/
          route.ts
        [snapshotId]/
          route.ts
      public/
        rankings/
          [pageId]/
            route.ts
  components/
    rankings/
      ranking-table.tsx
      ranking-summary-card.tsx
      algorithm-badge.tsx
    players/
      player-form.tsx
      player-table.tsx
    tournaments/
      tournament-form.tsx
      match-table.tsx
  lib/
    supabase/
      client.ts
      server.ts
    ranking-engine/
      types.ts
      adapter.ts
      python-runner.ts
    validators/
      player.ts
      tournament.ts
      match.ts
      ranking.ts
  scripts/
    ranking-python/
      README.md
```

## 6. Web UI 技术方案

### 6.1 页面清单

| 页面 | 路由 | 目标用户 | 功能 |
|------|------|----------|------|
| 首页/仪表盘 | `/` | 管理员 | 展示选手数、赛事数、最近排名快照、快捷入口 |
| 选手管理 | `/players` | 管理员 | 选手列表、创建选手、编辑积分基础信息 |
| 赛事列表 | `/tournaments` | 管理员 | 查看赛事、创建赛事、进入赛事详情 |
| 赛事详情 | `/tournaments/{id}` | 管理员 | 展示赛事信息、轮次、比赛数、排名状态 |
| 比赛录入 | `/tournaments/{id}/matches` | 管理员 | 按轮次录入比赛双方和比分 |
| 排名榜 | `/tournaments/{id}/rankings` | 管理员 | 查看默认算法排名、切换算法、查看快照 |
| 公开榜单 | `/public/rankings/{pageId}` | 外部访问者 | 只读展示排名结果和赛事信息 |
| 嵌入榜单 | `/embed/rankings/{pageId}` | 外部网站 | 适配 iframe 的纯榜单视图 |

### 6.2 组件设计

| 组件 | 说明 |
|------|------|
| `RankingTable` | 通用排名表，展示排名、选手、积分、胜负场、算法字段 |
| `RankingSummaryCard` | 展示冠军、总人数、算法、更新时间 |
| `AlgorithmBadge` | 展示 `Elo`、`SDR`、`Glicko-2`、`Hybrid` 标识 |
| `PlayerTable` | 选手列表，支持排序、搜索、分页 |
| `PlayerForm` | 创建和编辑选手 |
| `TournamentForm` | 创建和编辑赛事 |
| `MatchTable` | 比赛记录表，展示轮次、双方、比分、获胜者 |
| `MatchEditor` | 录入或编辑单场比赛 |
| `PublicRankingHeader` | 公开榜单顶部信息 |
| `EmbedRankingShell` | iframe 嵌入页外壳，隐藏导航和管理控件 |

### 6.3 UI 交互原则

- 管理端采用清晰的后台布局：顶部导航 + 主内容区。
- 榜单页优先保证移动端可读性。
- 比赛录入时必须校验比分为非负整数，且双方选手不能相同。
- 算法切换时展示当前快照来源，避免用户误以为实时排名一定已重新计算。
- 公开页和嵌入页只读，不展示编辑、删除、计算按钮。

## 7. 后端/API 技术方案

### 7.1 API 设计

| API | 方法 | 用途 |
|-----|------|------|
| `/api/players` | `GET` | 查询选手列表 |
| `/api/players` | `POST` | 创建选手 |
| `/api/tournaments` | `GET` | 查询赛事列表 |
| `/api/tournaments` | `POST` | 创建赛事 |
| `/api/tournaments/{id}` | `GET` | 查询赛事详情 |
| `/api/tournaments/{id}/matches` | `GET` | 查询赛事比赛记录 |
| `/api/tournaments/{id}/matches` | `POST` | 新增或批量录入比赛 |
| `/api/rankings/calculate` | `POST` | 触发排名计算 |
| `/api/rankings/{snapshotId}` | `GET` | 查询排名快照 |
| `/api/public/rankings/{pageId}` | `GET` | 查询公开榜单数据 |

### 7.2 关键接口说明

#### `POST /api/rankings/calculate`

请求示例：

```json
{
  "tournamentId": "t_001",
  "algorithm": "hybrid",
  "saveSnapshot": true
}
```

响应示例：

```json
{
  "snapshotId": "rs_001",
  "algorithm": "hybrid",
  "generatedAt": "2026-06-24T12:00:00Z",
  "rankings": [
    {
      "playerId": "p_001",
      "name": "选手1",
      "rank": 1,
      "rating": 1532.4,
      "matches": 5,
      "wins": 4,
      "losses": 1,
      "draws": 0
    }
  ]
}
```

校验规则：

- `tournamentId` 必须存在。
- `algorithm` 必须是 `elo`、`sdr`、`glicko2`、`hybrid` 之一。
- 赛事必须存在有效选手和比赛记录。
- 比赛双方必须能映射到已存在选手。

### 7.3 错误处理

| 场景 | HTTP 状态码 | 处理方式 |
|------|-------------|----------|
| 参数格式错误 | `400` | 返回字段级错误信息 |
| 资源不存在 | `404` | 返回明确资源类型和 ID |
| 算法执行失败 | `500` | 记录错误日志，返回通用失败信息 |
| 公开页面未启用 | `404` | 不泄露内部赛事信息 |
| 权限不足 | `403` | MVP 启用认证后使用 |

## 8. 数据库模型方案

### 8.1 `organizations`

用于预留俱乐部或外部业务隔离能力。MVP 可默认创建一个组织。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `uuid` | 主键 |
| `name` | `text` | 组织名称 |
| `slug` | `text` | URL 友好标识 |
| `created_at` | `timestamp` | 创建时间 |

### 8.2 `players`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `uuid` | 主键 |
| `organization_id` | `uuid` | 所属组织 |
| `name` | `text` | 选手名称 |
| `initial_rating` | `numeric` | 初始积分，默认 1500 |
| `current_rating` | `numeric` | 当前展示积分 |
| `rd` | `numeric` | Glicko-2 评分偏差 |
| `sigma` | `numeric` | Glicko-2 波动性 |
| `created_at` | `timestamp` | 创建时间 |
| `updated_at` | `timestamp` | 更新时间 |

### 8.3 `tournaments`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `uuid` | 主键 |
| `organization_id` | `uuid` | 所属组织 |
| `name` | `text` | 赛事名称 |
| `format` | `text` | 赛制，例如 `single_elimination` |
| `status` | `text` | `draft`、`active`、`completed` |
| `default_algorithm` | `text` | 默认 `hybrid` |
| `started_at` | `timestamp` | 开始时间 |
| `ended_at` | `timestamp` | 结束时间 |
| `created_at` | `timestamp` | 创建时间 |

### 8.4 `matches`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `uuid` | 主键 |
| `tournament_id` | `uuid` | 所属赛事 |
| `round` | `integer` | 比赛轮次 |
| `player1_id` | `uuid` | 选手 1 |
| `player2_id` | `uuid` | 选手 2 |
| `score1` | `integer` | 选手 1 得分 |
| `score2` | `integer` | 选手 2 得分 |
| `winner_id` | `uuid` | 获胜者 |
| `played_at` | `timestamp` | 比赛时间 |
| `created_at` | `timestamp` | 创建时间 |

### 8.5 `ranking_snapshots`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `uuid` | 主键 |
| `tournament_id` | `uuid` | 所属赛事 |
| `algorithm` | `text` | 使用算法 |
| `generated_at` | `timestamp` | 计算时间 |
| `source_hash` | `text` | 输入数据摘要，用于判断数据是否变化 |
| `created_at` | `timestamp` | 创建时间 |

### 8.6 `ranking_snapshot_items`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `uuid` | 主键 |
| `snapshot_id` | `uuid` | 所属快照 |
| `player_id` | `uuid` | 选手 |
| `rank` | `integer` | 排名 |
| `rating` | `numeric` | 积分 |
| `rd` | `numeric` | Glicko-2 RD，可为空 |
| `sigma` | `numeric` | Glicko-2 sigma，可为空 |
| `matches` | `integer` | 比赛数 |
| `wins` | `integer` | 胜场 |
| `losses` | `integer` | 负场 |
| `draws` | `integer` | 平局 |

### 8.7 `public_pages`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `uuid` | 主键 |
| `page_id` | `text` | 公开访问 ID |
| `tournament_id` | `uuid` | 绑定赛事 |
| `snapshot_id` | `uuid` | 默认展示快照 |
| `title` | `text` | 页面标题 |
| `theme` | `text` | 主题，例如 `light`、`dark` |
| `enabled` | `boolean` | 是否启用 |
| `created_at` | `timestamp` | 创建时间 |

## 9. Ranking Engine 算法接入方案

### 9.1 当前算法资产

| 算法 | 文件 | MVP 用途 |
|------|------|----------|
| Elo | `rating-algorithm/elo-rating/elo.py` | 基础积分算法 |
| SDR | `rating-algorithm/sdr-rating/sdr.py` | 比分差敏感算法 |
| Glicko-2 | `rating-algorithm/glicko2-rating/glicko2.py` | 长期稳定排名 |
| Hybrid | `rating-algorithm/sdr-glicko2-hybrid/sdr_glicko2.py` | HEMA 默认算法 |

### 9.2 统一算法类型

```ts
type RankingAlgorithm = "elo" | "sdr" | "glicko2" | "hybrid";
```

### 9.3 统一输入结构

```ts
interface RankingEngineInput {
  tournament: {
    id: string;
    name: string;
    format: string;
  };
  players: Array<{
    id: string;
    name: string;
    rating: number;
    rd?: number;
    sigma?: number;
  }>;
  matches: Array<Array<{
    id: string;
    round: number;
    player1: string;
    player2: string;
    score1: number;
    score2: number;
  }>>;
  algorithm: RankingAlgorithm;
}
```

### 9.4 统一输出结构

```ts
interface RankingEngineOutput {
  algorithm: RankingAlgorithm;
  generatedAt: string;
  rankings: Array<{
    playerId: string;
    name: string;
    rank: number;
    rating: number;
    rd?: number;
    sigma?: number;
    matches: number;
    wins: number;
    losses: number;
    draws: number;
  }>;
}
```

### 9.5 MVP 调用方式

MVP 阶段建议先使用 `python-runner` 适配层：

- Next.js API 从数据库读取选手和比赛。
- API 将数据库记录转换为当前 Python 算法可接受的 JSON。
- 适配层根据 `algorithm` 选择对应 Python 模块。
- Python 算法返回排名 JSON。
- 适配层将算法结果映射回 `playerId`。
- API 保存 `ranking_snapshots` 和 `ranking_snapshot_items`。

### 9.6 标识兼容策略

当前 Python 算法主要使用 `name` 识别选手，而 Web 系统应使用 `id` 作为主键。

MVP 处理方式：

- 数据库存储使用 `player.id`。
- 调用算法前生成 `id -> name` 与 `name -> id` 映射。
- 要求同一赛事内选手名称唯一。
- 算法返回后按 `name` 映射回 `playerId`。

后续优化：

- 修改算法适配层，使算法内部可直接使用 `id`。
- 为算法增加标准输入输出测试，降低迁移风险。

## 10. 数据流与关键流程

### 10.1 创建赛事流程

```text
管理员填写赛事信息
        |
        v
POST /api/tournaments
        |
        v
写入 tournaments
        |
        v
返回赛事详情页
```

### 10.2 录入比赛流程

```text
管理员进入比赛录入页
        |
        v
选择轮次、选手、比分
        |
        v
前端表单校验
        |
        v
POST /api/tournaments/{id}/matches
        |
        v
服务端校验选手、比分、轮次
        |
        v
写入 matches
```

### 10.3 排名计算流程

```text
管理员点击重新计算排名
        |
        v
POST /api/rankings/calculate
        |
        v
读取 players + matches
        |
        v
构造 RankingEngineInput
        |
        v
调用 Python Ranking Engine
        |
        v
标准化 RankingEngineOutput
        |
        v
写入 ranking_snapshots + ranking_snapshot_items
        |
        v
返回排名结果
```

### 10.4 公开榜单访问流程

```text
访问 /public/rankings/{pageId}
        |
        v
GET /api/public/rankings/{pageId}
        |
        v
校验 public_pages.enabled
        |
        v
读取绑定 snapshot
        |
        v
返回只读榜单数据
```

## 11. 对外发布能力方案

### 11.1 公开 URL

MVP 优先支持公开 URL：

```text
/public/rankings/{pageId}
```

页面特性：

- 只读展示。
- 支持移动端。
- 展示赛事名、算法、更新时间。
- 不展示后台导航和管理按钮。

### 11.2 iframe 嵌入页

嵌入页路由：

```text
/embed/rankings/{pageId}
```

嵌入示例：

```html
<iframe
  src="https://hema-ranking.example.com/embed/rankings/demo"
  width="100%"
  height="720"
  style="border:0;"
></iframe>
```

页面特性：

- 纯榜单布局。
- 可通过 query 参数控制主题和密度。
- 不显示站点导航。
- 后续可增加允许嵌入域名白名单。

### 11.3 后续组件化

MVP 先内部组件化，后续再发布：

- `RankingTable`
- `RankingSummaryCard`
- `PlayerRankingCard`
- `AlgorithmBadge`

发布形态可选：

- React 组件包。
- Web Component。
- iframe SaaS 嵌入。

## 12. 分步执行计划

### 阶段 0：项目初始化与工程规范

目标：

- 建立 Next.js MVP 工程基础。
- 统一代码规范和目录结构。

主要任务：

- 初始化 `Next.js App Router + TypeScript` 项目。
- 配置 `Tailwind CSS`。
- 引入 `shadcn/ui`。
- 配置 ESLint、Prettier。
- 规划 `app`、`components`、`lib` 目录。
- 准备环境变量规范：`SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`。

产出物：

- 可启动的 Web 工程。
- 基础布局和全局样式。
- 工程目录约定。

验收标准：

- 本地开发服务可正常启动。
- 首页能正常渲染。
- TypeScript 和 lint 无基础配置错误。

### 阶段 1：数据库与基础数据模型

目标：

- 建立 MVP 所需数据模型。
- 支持选手、赛事、比赛和排名快照的持久化。

主要任务：

- 在 Supabase 中创建 MVP 数据表。
- 创建 `organizations` 默认记录。
- 创建 `players`、`tournaments`、`matches`。
- 创建 `ranking_snapshots`、`ranking_snapshot_items`。
- 创建 `public_pages`。
- 明确外键关系和基础索引。

产出物：

- Supabase 数据表。
- 数据模型说明。
- 基础测试数据。

验收标准：

- 能手动插入选手、赛事、比赛数据。
- 能查询某个赛事下的比赛和选手。
- 数据结构能覆盖当前 `tournament_data.json` 的信息。

### 阶段 2：Web UI 基础框架与页面

目标：

- 先搭建用户可见的页面骨架和核心交互路径。
- 明确管理端、公开页和嵌入页的信息架构。

主要任务：

- 实现管理端 Layout。
- 实现首页/仪表盘页面。
- 实现选手管理页静态结构。
- 实现赛事列表和赛事详情页静态结构。
- 实现比赛录入页静态结构。
- 实现排名榜页静态结构。
- 实现公开榜单页和嵌入榜单页静态结构。
- 抽取 `RankingTable`、`PlayerTable`、`MatchTable` 等核心展示组件。

产出物：

- 页面路由骨架。
- 核心 UI 组件。
- 可用的静态/Mock 数据展示。

验收标准：

- 管理端主要页面可通过导航访问。
- 排名表、选手表、比赛表能展示 Mock 数据。
- 公开页和嵌入页不显示管理操作。
- 页面在桌面端和移动端具备基础可读性。

### 阶段 3：后端 API 与 Ranking Engine 封装

目标：

- 将 UI 页面连接到真实 API。
- 封装统一 Ranking Engine，复用当前 Python 算法。

主要任务：

- 实现 Supabase 服务端客户端。
- 实现选手 API：查询、创建。
- 实现赛事 API：查询、创建、详情。
- 实现比赛 API：查询、录入。
- 实现排名计算 API。
- 实现公开榜单 API。
- 封装 `RankingEngineInput` 与 `RankingEngineOutput`。
- 封装 Python 算法调用适配层。
- 将算法返回结果保存为排名快照。

产出物：

- MVP API 路由。
- Ranking Engine 适配层。
- 数据库到算法输入的转换逻辑。
- 算法输出到排名快照的转换逻辑。

验收标准：

- 能通过 API 创建选手和赛事。
- 能通过 API 录入比赛。
- 能触发至少一种算法计算排名。
- 能保存并查询排名快照。
- Hybrid 算法可作为默认算法执行。

### 阶段 4：比赛录入与排名计算闭环

目标：

- 完成从录入比赛到展示排名的端到端闭环。

主要任务：

- 将选手管理页接入真实 API。
- 将赛事管理页接入真实 API。
- 将比赛录入页接入真实 API。
- 将排名榜页接入排名计算 API。
- 支持算法切换：`elo`、`sdr`、`glicko2`、`hybrid`。
- 支持查看最近一次排名快照。
- 增加输入错误提示和加载状态。

产出物：

- 可操作的选手管理。
- 可操作的赛事与比赛录入。
- 可展示真实计算结果的排名榜。

验收标准：

- 新建选手后能在选手列表看到。
- 新建赛事后能进入赛事详情。
- 录入比赛后能触发排名计算。
- 四种算法至少能完成一次排名计算。
- 排名结果与当前算法输出字段一致。

### 阶段 5：公开榜单与嵌入页

目标：

- 支持排名能力对外展示。

主要任务：

- 创建公开榜单配置。
- 将 `public_pages` 绑定到赛事和排名快照。
- 实现公开榜单页面。
- 实现 iframe 嵌入页面。
- 支持主题参数，例如 `theme=light`、`theme=dark`。
- 隐藏管理操作和内部调试信息。

产出物：

- 可分享的公开排名 URL。
- 可嵌入外部网站的 iframe URL。
- 公开榜单 API。

验收标准：

- 公开 URL 可在未登录状态访问。
- 公开页能展示赛事名、算法、更新时间和排名表。
- iframe 页面布局简洁，不出现管理导航。
- 禁用的公开页面不能访问。

### 阶段 6：测试、部署与验收

目标：

- 完成 MVP 发布前的质量检查和上线准备。

主要任务：

- 补充核心 API 测试或脚本验证。
- 使用当前 32 人淘汰赛测试数据验证算法接入。
- 检查页面基础响应式效果。
- 配置 Vercel 环境变量。
- 配置 Supabase 生产环境。
- 部署 MVP。
- 编写上线检查清单。

产出物：

- 可访问的 MVP 站点。
- 验收测试记录。
- 部署配置说明。

验收标准：

- 线上站点可访问。
- 能完成选手创建、赛事创建、比赛录入、排名计算。
- 能生成公开榜单页面。
- 当前四种算法可正常调用或有明确降级策略。
- 没有阻塞级控制台错误或 API 错误。

## 13. 验收标准汇总

MVP 总体验收标准：

- 可以管理选手、赛事和比赛。
- 可以基于比赛记录计算排名。
- 支持四种算法，默认使用融合算法。
- 可以展示算法对比结果。
- 可以保存排名快照。
- 可以生成公开榜单 URL。
- 可以通过 iframe 嵌入榜单。
- 页面具备基本响应式能力。
- 当前 Python 算法无需重写即可接入。

## 14. 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| Python 算法在 Vercel Serverless 中调用受限 | 线上计算不稳定 | MVP 可使用独立轻量 Python 服务，或部署到支持 Python 的服务 |
| 选手名称作为算法标识可能冲突 | 排名结果映射错误 | 同一赛事内限制选手名称唯一，并维护 `id/name` 映射 |
| 先做 UI 可能出现接口返工 | 页面字段与 API 不一致 | 阶段 2 使用与计划一致的 Mock 类型，阶段 3 固化类型定义 |
| Glicko-2 参数不易解释 | 用户难理解排名变化 | UI 显示简化积分，详情中解释 `rd` 和 `sigma` |
| 公开页面泄露管理信息 | 数据风险 | 公开 API 只返回必要字段，页面隐藏内部 ID 和操作按钮 |

## 15. 后续迭代方向

- 将 Elo、SDR 迁移为 TypeScript 实现，降低算法服务部署成本。
- 增加完整账号体系和组织权限。
- 支持 CSV/JSON 导入导出。
- 支持更多赛制，例如循环赛、瑞士轮、小组赛。
- 支持选手积分历史趋势图。
- 发布排名组件包或 Web Component。
- 增加外部 API Token，允许其他业务提交自己的选手和比赛数据。

## 16. 一句话结论

方案 A MVP 应先用 `Next.js + Supabase` 打通“选手管理、赛事比赛录入、算法计算、排名展示、公开发布”的完整闭环；当前 Python 算法通过统一 Ranking Engine 适配层接入，Web UI 在阶段 2 先行搭建页面骨架，后端 API 与算法封装在阶段 3 接入真实数据。
