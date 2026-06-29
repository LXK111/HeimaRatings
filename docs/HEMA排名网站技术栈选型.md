# HEMA 排名网站技术栈选型

## 1. 背景与目标

当前项目已经具备四种排名算法原型：

- `Elo`：简单稳定，适合基础积分排名。
- `SDR`：在 Elo 基础上引入比分差，适合 HEMA 这类比分能反映比赛质量的场景。
- `Glicko-2`：引入评分偏差和波动性，适合长期追踪选手实力。
- `SDR + Glicko-2 融合算法`：兼顾比分敏感性和长期稳定性，可作为 HEMA 排名的主推荐算法。

本次 Web 端选型需要同时满足两个方向：

- 做成一个独立的 HEMA 排名网站，支持记录比赛结果、选手积分、选手排名。
- 将排名相关能力和页面设计成可复用模块，后续支持外部业务使用自己的数据展示排名页面。

用户已确认的优先级：

- 交付形态：独立网站与可嵌入组件两者兼顾。
- 部署方式：低成本 MVP 优先。

## 2. 核心需求拆解

### 2.1 MVP 阶段必须具备

- 选手管理：创建选手、维护名称、初始积分、历史战绩。
- 比赛录入：录入比赛双方、比分、轮次、赛事信息。
- 积分计算：支持 Elo、SDR、Glicko-2、融合算法。
- 排名展示：展示积分、排名、胜负记录、算法差异。
- 数据导入导出：兼容当前 `players` 与 `matches` JSON 数据结构。
- 公开访问：生成某个赛事或榜单的公开排名页面。

### 2.2 后续对外发布能力

- 外部数据接入：外部业务可以提交自己的选手与比赛数据。
- 独立榜单页面：通过公开 URL 展示某个赛事、俱乐部或业务的榜单。
- 嵌入式展示：通过 iframe 或组件将排名榜嵌入其他网站。
- 算法接口化：外部业务可以调用 API 获取排名计算结果。
- 组件化发布：后续可发布 React 组件、Web Component 或 npm 包。

## 3. 当前算法资产

现有算法均为 Python 实现，并支持 JSON 风格输入输出：

| 算法 | 当前文件 | 输入特点 | 输出特点 | Web 接入建议 |
|------|----------|----------|----------|--------------|
| Elo | `elo-rating/elo.py` | `players` + `matches` | 排名 JSON | 可直接服务化，或迁移到 TypeScript |
| SDR | `sdr-rating/sdr.py` | `players` + `matches`，依赖比分差 | 排名 JSON | 短期服务化，长期可迁移 |
| Glicko-2 | `glicko2-rating/glicko2.py` | 支持 `rating`、`rd`、`sigma` | 排名 JSON，含不确定性参数 | 建议先保留 Python 实现 |
| 融合算法 | `sdr-glicko2-hybrid/sdr_glicko2.py` | 支持比分差和 Glicko-2 参数 | 排名 JSON | 建议作为 HEMA 默认算法 |

结论：

- MVP 不建议立即重写算法，优先复用 Python 资产。
- Web 端应定义统一 `Ranking Engine` 接口，避免页面直接绑定某个算法实现。
- 当算法稳定后，可将 Elo、SDR 等简单算法迁移到 TypeScript，复杂算法继续保留 Python 或逐步迁移。

## 4. 候选技术栈

### 4.1 方案 A：Next.js 全栈方案

技术组合：

- 前端：`Next.js + React + TypeScript`
- 样式：`Tailwind CSS + shadcn/ui`
- API：`Next.js Route Handlers` 或 `Server Actions`
- 数据库：`Supabase PostgreSQL`
- 算法层：短期 Python 算法服务，长期抽象为独立排名引擎包
- 部署：`Vercel + Supabase`

优势：

- 一套工程可同时承载页面、API、服务端逻辑和部署。
- React 生态成熟，后续拆出榜单组件更自然。
- Vercel 与 Supabase 组合适合低成本 MVP。
- TypeScript 能提升数据接口、组件 API、外部 SDK 的可维护性。
- Next.js 支持公开页面、动态路由、SEO 和服务端渲染。

劣势：

- 当前算法是 Python，实现完全同构需要额外迁移或服务化。
- 如果 Python 算法需要在线实时计算，可能需要额外部署轻量算法服务。
- 团队需要接受 React/Next.js 的工程约定。

适用场景：

- 需要快速上线一个可访问网站。
- 后续希望把排名页拆成 React 组件。
- 需要公开榜单页面、嵌入页面和 API 同时演进。

### 4.2 方案 B：Nuxt/Vue + FastAPI 方案

技术组合：

- 前端：`Nuxt + Vue + TypeScript`
- 样式：`Tailwind CSS + Naive UI` 或 `Element Plus`
- API：`FastAPI`
- 数据库：`Supabase PostgreSQL` 或自建 PostgreSQL
- 算法层：直接复用 Python 算法
- 部署：前端部署到 Vercel/Netlify，后端部署到 Render/Fly.io/云服务器

优势：

- Python 算法接入最自然，FastAPI 可直接调用当前算法模块。
- 前后端职责清晰，后端可以逐步发展为独立排名服务。
- Vue 对部分团队更易上手。

劣势：

- MVP 需要同时维护前端与后端两个工程。
- 部署链路比 Next.js 全栈方案更复杂。
- 后续发布可嵌入组件时，Vue 组件生态与外部 React 业务集成成本可能更高。

适用场景：

- 后端算法逻辑复杂，必须长期保持 Python。
- 团队更熟悉 Vue 与 Python。
- 未来明确要把 Ranking API 做成独立后端服务。

### 4.3 方案 C：纯前端静态站点方案

技术组合：

- 前端：`Vite + React + TypeScript` 或 `Vite + Vue + TypeScript`
- 数据：JSON 文件导入导出
- 算法：迁移到 TypeScript，在浏览器端计算
- 部署：GitHub Pages、Cloudflare Pages、Vercel 静态部署

优势：

- 部署成本最低，几乎不需要后端。
- 适合演示、单场赛事、离线数据导入导出。
- iframe 和静态公开页面实现简单。

劣势：

- 需要把算法迁移到 TypeScript，当前 Python 资产不能直接复用。
- 缺少账号、权限、数据库和长期历史记录能力。
- 外部业务接入能力较弱，无法天然提供服务端 API。
- 对多租户、俱乐部管理、赛事历史不友好。

适用场景：

- 只做原型或演示站。
- 数据量小，且不需要多人协作。
- 不需要后端权限和长期存储。

## 5. 方案对比

| 维度 | 方案 A：Next.js 全栈 | 方案 B：Nuxt + FastAPI | 方案 C：纯前端静态站 |
|------|----------------------|------------------------|----------------------|
| MVP 开发速度 | 高 | 中 | 高 |
| 低成本部署 | 高 | 中 | 最高 |
| 复用 Python 算法 | 中 | 高 | 低 |
| 后续组件化发布 | 高 | 中 | 高 |
| 外部 API 能力 | 高 | 高 | 低 |
| 公开榜单页面 | 高 | 高 | 中 |
| 多租户扩展 | 中到高 | 高 | 低 |
| 运维复杂度 | 低 | 中 | 最低 |
| 长期可维护性 | 高 | 高 | 中 |

## 6. 推荐技术栈

推荐采用方案 A：`Next.js + TypeScript + Supabase + Python Ranking Engine`。

### 6.1 推荐组合

| 层级 | 推荐技术 | 选择原因 |
|------|----------|----------|
| Web 应用 | `Next.js` | 同时支持页面、API、SSR、部署，适合低成本 MVP |
| 编程语言 | `TypeScript` | 统一前端、接口、组件类型，利于后续对外发布 |
| UI 样式 | `Tailwind CSS + shadcn/ui` | 快速构建现代管理后台和公开榜单页 |
| 表格 | `TanStack Table` | 排名榜、选手表、比赛记录表可高度复用 |
| 图表 | `Recharts` | 展示积分趋势、胜率、算法对比足够轻量 |
| 数据库 | `Supabase PostgreSQL` | 低成本获得数据库、认证、权限能力 |
| 算法层 | `Python Ranking Engine` | 最大化复用当前四种算法 |
| 部署 | `Vercel + Supabase` | 快速上线，初期运维成本低 |
| 后续组件发布 | React 组件包或 Web Component | 支持其他业务嵌入排名页面 |

### 6.2 推荐理由

- 低成本 MVP：Vercel 和 Supabase 可以快速完成上线闭环。
- 对外发布友好：React 组件、公开页面、iframe、API 都有清晰路径。
- 保留算法资产：短期不重写 Python 算法，降低初期风险。
- 接口边界清晰：通过统一 Ranking API 隔离页面与算法实现。
- 后续扩展自然：从单站点逐步演进到多租户、组件库、独立 API 服务。

## 7. 建议系统架构

```text
外部用户 / HEMA 管理员 / 其他业务系统
        |
        v
Next.js Web App
        |
        +-- 管理页面：选手、赛事、比赛录入、排名结果
        +-- 公开页面：俱乐部榜单、赛事榜单、选手详情
        +-- 嵌入页面：iframe / embeddable widget
        |
        v
Ranking API
        |
        +-- 数据校验
        +-- 算法选择
        +-- 结果标准化
        |
        v
Ranking Engine
        |
        +-- Elo
        +-- SDR
        +-- Glicko-2
        +-- SDR + Glicko-2 融合算法
        |
        v
Supabase PostgreSQL
        |
        +-- players
        +-- matches
        +-- tournaments
        +-- ranking_snapshots
        +-- public_pages
```

## 8. 模块划分

### 8.1 Web App

负责用户可见页面：

- 选手列表。
- 比赛录入。
- 赛事管理。
- 积分榜。
- 算法对比页。
- 公开榜单页。
- 嵌入式榜单页。

### 8.2 Ranking API

负责统一输入输出：

- 接收 `players`、`matches`、`algorithm`。
- 校验比分、选手是否存在、比赛轮次是否合法。
- 调用 Ranking Engine。
- 返回标准化 `rankings`。
- 保存排名快照。

### 8.3 Ranking Engine

负责算法计算：

- 初期：Next.js API 调用 Python 脚本或轻量 Python 服务。
- 中期：抽象统一算法接口，支持同步计算与异步任务。
- 长期：将稳定算法迁移为 TypeScript 包，复杂算法保留 Python 服务。

建议统一接口：

```ts
type RankingAlgorithm = "elo" | "sdr" | "glicko2" | "hybrid";

interface RankingEngineInput {
  players: PlayerInput[];
  matches: MatchInput[][];
  algorithm: RankingAlgorithm;
}

interface RankingEngineOutput {
  rankings: RankingOutput[];
  algorithm: RankingAlgorithm;
  generatedAt: string;
}
```

### 8.4 数据层

MVP 数据表建议：

| 表 | 作用 |
|----|------|
| `players` | 存储选手基础信息和当前默认积分 |
| `tournaments` | 存储赛事信息 |
| `matches` | 存储比赛双方、比分、轮次、时间 |
| `ranking_snapshots` | 存储某次计算后的排名结果 |
| `public_pages` | 存储公开榜单配置 |
| `organizations` | 后续支持俱乐部或外部业务隔离 |

MVP 可先弱化多租户，只保留 `organization_id` 字段，后续再完善权限。

### 8.5 对外发布层

建议分三步：

- 公开 URL：例如 `/public/rankings/{pageId}`，最适合 MVP。
- iframe embed：例如 `<iframe src="https://site.com/embed/rankings/{pageId}"></iframe>`。
- 组件/SDK：后续发布 `RankingTable`、`PlayerRankingCard`、`RankingTrendChart`。

## 9. 数据接口建议

### 9.1 输入数据

兼容当前测试数据的基础结构：

```json
{
  "players": [
    {
      "id": "p1",
      "name": "选手1",
      "rating": 1500,
      "rd": 350,
      "sigma": 0.2
    }
  ],
  "matches": [
    [
      {
        "id": "m1",
        "round": 1,
        "player1": "p1",
        "player2": "p2",
        "score1": 9,
        "score2": 6,
        "playedAt": "2026-06-01T10:00:00Z"
      }
    ]
  ],
  "algorithm": "hybrid"
}
```

### 9.2 输出数据

```json
{
  "algorithm": "hybrid",
  "generatedAt": "2026-06-01T11:00:00Z",
  "rankings": [
    {
      "playerId": "p1",
      "name": "选手1",
      "rank": 1,
      "rating": 1524.6,
      "rd": 280.5,
      "sigma": 0.19,
      "matches": 3,
      "wins": 3,
      "losses": 0,
      "draws": 0
    }
  ]
}
```

### 9.3 兼容策略

- 当前算法使用 `name` 作为选手标识，Web 端建议使用 `id` 作为主键。
- API 层负责把 `id` 映射为算法需要的 `name` 或内部标识。
- 保留 `rating`、`rd`、`sigma` 字段，确保 Glicko-2 和融合算法可用。
- `matches` 继续支持按轮次数组组织，兼容当前算法按轮更新的逻辑。

## 10. 算法接入策略

### 10.1 MVP 阶段

推荐做法：

- 保留当前 Python 算法文件。
- 新增统一算法调用封装，但不改动算法核心。
- Web API 将数据库数据转换为算法所需 JSON。
- 计算完成后将结果写入 `ranking_snapshots`。

可选实现：

- 本地开发阶段通过 Python 子进程调用算法。
- 部署阶段使用轻量 Python HTTP 服务承载算法。
- 单场赛事数据量较小时，也可先用离线任务计算并保存快照。

### 10.2 中期阶段

推荐做法：

- 将算法封装为独立 `ranking-engine` 模块。
- 为每种算法建立统一测试数据和回归测试。
- 对 Elo、SDR 这类较简单算法提供 TypeScript 实现。
- 保持 Python 与 TypeScript 结果一致性测试。

### 10.3 长期阶段

推荐做法：

- 对外提供 Ranking API。
- 发布前端榜单组件。
- 支持外部业务传入自己的选手、比赛和榜单样式配置。
- 支持多租户、权限、计费或私有部署。

## 11. 对外发布路径

### 11.1 公开榜单页面

最适合 MVP 的方式：

- 每个赛事或俱乐部生成一个公开页面。
- 页面只读，不暴露管理入口。
- 支持展示 Logo、赛事名、更新时间、算法说明。
- 支持移动端浏览。

### 11.2 iframe 嵌入

适合外部网站快速接入：

```html
<iframe
  src="https://hema-ranking.example.com/embed/rankings/demo"
  width="100%"
  height="720"
  style="border:0;"
></iframe>
```

注意事项：

- 嵌入页需要独立布局，不显示管理导航。
- 支持主题配置，例如浅色、深色、紧凑模式。
- 后续可限制允许嵌入的域名。

### 11.3 组件或 SDK

适合后续高级接入：

```tsx
<RankingTable
  data={rankings}
  columns={["rank", "name", "rating", "wins", "losses"]}
  theme="dark"
/>
```

建议先内部组件化，再考虑发布 npm 包。

## 12. 分阶段路线

### 12.1 阶段一：低成本 MVP

目标：

- 完成独立排名网站。
- 支持 JSON 导入、比赛录入、算法计算、公开榜单。
- 支持融合算法作为默认算法，同时允许切换其他算法对比。

推荐技术：

- `Next.js + TypeScript`
- `Tailwind CSS + shadcn/ui`
- `Supabase PostgreSQL`
- Python 算法服务或子进程调用
- `Vercel + Supabase`

### 12.2 阶段二：对外复用

目标：

- 排名页可通过 iframe 嵌入其他网站。
- Ranking API 支持外部数据提交。
- 排名组件内部模块化。

新增能力：

- 公开页面配置。
- API Token。
- 主题配置。
- 排名快照版本管理。

### 12.3 阶段三：平台化

目标：

- 支持多个俱乐部、赛事组织或外部业务。
- 支持权限、成员管理、长期积分历史。
- 支持组件包或 SDK 发布。

新增能力：

- 多租户组织模型。
- 角色权限。
- 审计日志。
- 私有部署或企业版配置。

## 13. 风险与取舍

| 风险 | 影响 | 建议 |
|------|------|------|
| Python 算法与 Next.js 部署形态不完全一致 | 需要额外算法服务或迁移成本 | MVP 保留 Python，统一接口隔离实现 |
| 过早做多租户导致复杂度上升 | 拖慢 MVP | 数据表预留 `organization_id`，权限后置 |
| 纯前端方案难以支撑外部 API | 后续平台化受限 | 不作为主方案，只作为演示备选 |
| 算法结果需要可解释 | 用户可能不理解排名变化 | 排名页展示算法说明和积分变化原因 |
| iframe 嵌入样式难统一 | 外部页面体验不一致 | 提供主题参数和紧凑布局 |

## 14. 最终建议

推荐主路线：

- 使用 `Next.js + TypeScript + Tailwind CSS + shadcn/ui` 开发 Web 应用。
- 使用 `Supabase PostgreSQL` 作为低成本数据层。
- 初期保留 Python 四种算法，通过统一 Ranking Engine 接口接入。
- 默认排名算法使用 `SDR + Glicko-2 融合算法`，同时支持 Elo、SDR、Glicko-2 对比展示。
- MVP 优先支持公开榜单 URL，再支持 iframe 嵌入。
- 中长期将排名表格和选手卡片拆成可复用 React 组件，并视需求发布为组件包或 Web Component。

一句话总结：

> 先用 Next.js 全栈方案快速做出可用的 HEMA 排名网站，用统一 Ranking API 保护当前 Python 算法资产，再通过公开页面、iframe 和组件化逐步把排名能力开放给外部业务。
