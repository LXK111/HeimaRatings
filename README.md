# HeimaRatings

## 修改记录

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-24 | TRAE | 创建 README，记录阶段 0 工程状态 |
| v0.2 | 2026-06-24 | TRAE | 更新当前阶段、后续阶段、遗留 TODO，并补充文档记录位置提醒 |
| v0.3 | 2026-06-25 | TRAE | 将 rating-algorithm 目录移入 HeimaRatings，修改 runner 和 adapter 路径引用，使项目完全自包含 |

## 重要提醒：文档记录位置

当前项目的方案、阶段执行记录和代码生成变化不只记录在 README 中，主要文档位置如下：

- 工程阶段文档：`HeimaRatings/docs/`
- 阶段 4 设计规格：`HeimaRatings/docs/superpowers/specs/2026-06-24-stage-4-match-ranking-loop-design.md`
- 总体代码生成记录与方案变化：`mydocs/HEMA排名网站代码生成记录与方案变化.md`
- 同步到 `mydocs` 的阶段文档：`mydocs/stage-4.md`
- 技术方案与选型文档：`mydocs/HEMA排名网站方案A-MVP技术方案.md`、`mydocs/HEMA排名网站技术栈选型.md`

README 只保留项目入口级摘要；阶段细节、验证记录和方案变化以 `docs/` 与 `mydocs/` 为准。

## 项目简介

HEMA Ratings 是一个 HEMA 排名网站 MVP Web 工程，用于记录赛事、比赛项目、比赛结果、选手分武器积分和排名。

当前 MVP 技术栈：

- Web：`Next.js App Router + React + TypeScript`
- 样式：`Tailwind CSS`
- API：`Next.js Route Handlers`
- 算法：通过 TypeScript Adapter 调用当前目录下已有 Python 排名算法
- 数据：当前使用 Mock Repository，后续接入 Supabase PostgreSQL

## 当前阶段

当前已推进到阶段 4：比赛录入与排名计算闭环。

已完成阶段：

- 阶段 0：创建 `HeimaRatings` 基础工程，完成 Next.js、TypeScript、Tailwind CSS、目录结构和首页 Mock 展示。
- 阶段 1：创建 Supabase/PostgreSQL 初始 schema、种子数据、数据库行类型和领域模型。
- 阶段 2：完成 Web UI 基础框架与页面，包含控制台、武器、选手、赛事、比赛项目、比赛录入、排名榜、公开榜单和嵌入页。
- 阶段 3：完成后端 API、Mock Repository、Ranking Engine Adapter 和 Python runner，打通 `/api/rankings/calculate` 排名计算链路。
- 阶段 4：在比赛录入页实现页面临时闭环，支持录入比赛草稿、本地追加、选择武器和算法、重新计算并展示排名结果。

当前阶段边界：

- 新增比赛只保存在当前页面状态，刷新页面会丢失。
- 当前不写入 Supabase。
- 当前不保存排名快照。
- 公开榜单和嵌入榜单仍使用 Mock 数据。

## 后续阶段

- 阶段 5：公开榜单与嵌入页。将排名快照、公开页面和 iframe 嵌入能力连成可发布路径。
- 阶段 6：测试、部署与验收。补充关键测试，配置部署环境，完成 MVP 验收。
- 后续增强：接入 Supabase Repository，将阶段 4 的页面临时状态替换为真实持久化。
- 后续增强：保存 `ranking_snapshots`，让公开榜单读取真实最新快照。
- 后续增强：完善赛事编排、签表、淘汰晋级、项目级排名和多组织数据隔离。

## 遗留 TODO

- 接入 Supabase SDK 与真实项目配置。
- 将 `POST /api/tournaments/[id]/matches` 从草稿返回改为真实写库。
- 将 `/api/rankings/calculate` 的计算结果保存为排名快照。
- 改造 `/public/rankings/[pageId]` 与 `/embed/rankings/[pageId]`，读取真实快照而不是 Mock 数据。
- 为阶段 4 客户端工作台拆分更细的表单、列表和排名结果组件，降低单文件复杂度。
- 增加接口测试和 Ranking Engine 输入输出回归测试。
- 部署前确认运行环境是否支持 `python3`，或将 Python Ranking Engine 独立服务化。

## 编译运行依赖环境

- **Node.js**: >= 18.18.0（Next.js 要求）
- **npm**: >= 9.0.0
- **Python 3**: >= 3.8.0（排名算法依赖，运行时需要 `python3` 命令可用）
- **数据库**: 当前阶段无需配置（使用 Mock Repository，后续接入 Supabase PostgreSQL）

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

# ESLint 代码检查
npm run lint

# 生产构建
npm run build

# 生产模式运行（需先执行 build）
npm run start
```

访问地址：`http://localhost:3000`

**注意**：排名计算功能依赖本机 `python3`；若环境中 Python 命令不是 `python3`（如 Windows 下为 `python`），需修改 `lib/ranking-engine/adapter.ts` 中的 spawn 命令。

## 关键目录

```text
HeimaRatings/
  app/                    Next.js 页面与 API 路由
  components/             UI、布局、排名榜和比赛工作台组件
  database/               数据库迁移和种子数据
  docs/                   工程阶段文档和设计规格
  lib/                    领域类型、数据库类型、服务端仓储、Ranking Engine 适配
  rating-algorithm/       Elo、SDR、Glicko-2、Hybrid 四种排名算法实现
  scripts/                Python Ranking Engine runner
```
