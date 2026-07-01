# 阶段 60：部署前运行形态收口

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 60 执行记录，补充部署清单、环境模板和 predeploy 验收 |

## 目标

阶段 60 的目标是把当前工程从“功能可运行”收口到“部署前可检查、可执行、可追踪”。

本阶段不继续扩展业务能力，而是明确生产运行形态、环境变量、数据库迁移顺序、Python Ranking Engine 风险和部署前验收命令。

## 范围

- 新增部署前检查清单。
- 新增生产环境变量模板。
- 新增 `npm run predeploy:verify`。
- 明确 Supabase DDL 和 seed 执行顺序。
- 明确 Vercel 环境变量和本地验收变量边界。
- 明确 Python Ranking Engine 当前仍依赖部署环境中的 `python3`。

## 非目标

- 不重构 Ranking Engine 为独立服务。
- 不改变数据库 schema。
- 不改变认证/RLS policy。
- 不执行真实生产部署。
- 不推进阶段 56/57 的交互业务优化。

## 实现记录

- 新增 `scripts/verify_predeploy.mjs`，串联 `check`、`ranking:verify` 和 Mock 模式 `verify`。
- 更新 `package.json`，新增 `npm run predeploy:verify`。
- 新增 `.env.production.example`，记录生产和验收环境变量模板。
- 新增 `docs/deployment-checklist.md`，整理运行形态、DDL 顺序、环境变量和验收命令。
- 更新 `README.md` 当前阶段、部署前主线和验收命令说明。
- 更新 `docs/HEMA排名网站代码生成记录与方案变化.md`，记录阶段 60。

## 验证记录

- `node --check scripts/verify_predeploy.mjs`：通过，脚本语法无错误。
- `npm run predeploy:verify`：通过，已完成类型检查、Ranking Engine 回归和 Mock 模式完整本地验收。
- `npm run check`：通过，TypeScript 类型检查无错误。
- `git diff --check`：通过，当前变更无空白格式问题。

## 边界与后续

- 部署前主线已收口到可按清单执行。
- 阶段 56 和阶段 57 继续作为部署后交互业务优化项。
- 如果部署平台无法运行 `python3`，下一步应优先独立部署 Ranking Engine 或迁移算法实现，而不是继续叠加管理端功能。
