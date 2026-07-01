# 阶段 50：Supabase 真库 Ranking Engine 输入构造回归验收

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 50 执行记录，新增 Supabase 真库 Ranking Engine 输入构造回归验收 |

## 目标

阶段 50 的目标是验证 Supabase 真库数据经过 Repository 和 `/api/rankings/calculate` 后，Ranking Engine 输入仍只包含真实比赛，不把轮空状态转换成虚拟比赛。

阶段 48 已覆盖 Ranking Engine 直接输入，阶段 49 已覆盖 Mock API/Repository 路径。本阶段补齐真库路径，重点验证真实数据、真实组织上下文和管理 API 鉴权路径下的输入构造。

## 范围

- 新增 `npm run ranking:supabase:verify`。
- 使用 service role 创建临时组织、临时 editor membership、武器、选手、积分、赛事项目、参赛名单和真实比赛。
- 使用 editor 测试账号登录后调用 `/api/rankings/calculate`。
- 验证长剑项目只统计两场真实比赛，首轮轮空选手不会获得虚拟首轮比赛。
- 验证军刀项目只统计本项目、本武器真实比赛，不串入长剑选手。
- 验收结束后删除临时组织，级联清理临时数据。

## 非目标

- 不新增数据库 migration。
- 不修改 RLS policy。
- 不修改 Ranking Engine 算法。
- 不固定 rating 精确值。
- 不引入 `bracket_slots` 表。

## 实现记录

- 新增 `scripts/verify_supabase_ranking_input_construction.mjs`：
  - 读取 `.env.local` 和 `.env.database.local`。
  - 使用 `SUPABASE_SERVICE_ROLE_KEY` 播种和清理临时数据。
  - 使用 editor 账号建立 SSR cookie 登录态。
  - 以 Supabase 数据源和鉴权开启模式启动临时生产服务。
  - 通过组织 slug header 固定临时组织上下文。
  - 通过 Ranking Engine 输出中的 `matches`、`wins`、`losses` 反推 Repository 构造输入没有多出虚拟比赛。
- 更新 `package.json`，新增 `ranking:supabase:verify` 命令。

## 验证记录

- `node --check scripts/verify_supabase_ranking_input_construction.mjs`：通过，脚本语法无错误。
- `npm run ranking:supabase:verify`：通过，已验证 Supabase 真库输入构造、真实管理 API 鉴权路径和临时数据清理。
- `npm run ranking:input:verify`：通过，Mock API/Repository 输入构造回归仍通过。
- `npm run ranking:verify`：通过，Ranking Engine 直接输入回归仍通过。
- `npm run check`：通过，TypeScript 类型检查无错误。
- `git diff --check`：通过，当前变更无空白格式问题。

## 边界与后续

- 当前阶段验证真库输入构造，不改变数据模型。
- 后续可继续推进完整 `bracket_slots` 模型，支持固定签位、种子位审计和复杂轮空可视化。
