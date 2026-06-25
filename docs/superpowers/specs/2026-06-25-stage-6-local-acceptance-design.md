# 阶段 6：本地验收闭环设计

## 修改记录

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-25 | TRAE | 创建阶段 6 设计规格，确认采用本地验收闭环方案 |
| v0.2 | 2026-06-25 | TRAE | 根据验收问题调整 `verify`，改为自启动临时生产服务后执行 smoke check |

## 目标

阶段 6 的目标是让 HEMA Ratings MVP 可以被本地稳定复现、验证和交付。核心问题是：新环境拿到 `HeimaRatings` 后，能否安装依赖、编译、启动，并用一组最小检查确认核心链路可用。

本阶段不追求完整自动化测试覆盖率，也不接入真实云部署平台。

## 范围

- 新增本地 smoke check 脚本。
- 新增一键验收命令。
- 补充阶段 6 执行文档。
- 更新 README、`mydocs/README.md` 和总记录文档。
- 验证 TypeScript、生产构建、Ranking Engine、公开榜单 API 等核心链路。

## 非目标

- 不引入 Vitest、Playwright 或其他测试框架。
- 不接入 Vercel、Supabase 或真实部署流水线。
- 不新增真实数据库配置。
- 不修改业务数据持久化边界。
- 不把 Mock Repository 替换为 Supabase Repository。

## 推荐方案

采用本地验收闭环：

- 使用 Node 原生能力实现 `scripts/smoke_check.mjs`。
- 通过本地 Next.js 服务访问关键 API。
- 使用 `package.json` 脚本组合本地验收流程，`verify` 自行启动临时生产服务，避免依赖外部 dev server 状态。
- 用文档明确验收步骤、通过标准和已知限制。

## 脚本设计

### `scripts/smoke_check.mjs`

职责：

- 检查 `node`、`npm` 和 `python3` 命令是否可用。
- 检查目标服务地址，默认 `http://localhost:3000`。
- 请求关键 API：
  - `/api/weapons`
  - `/api/tournaments`
  - `/api/rankings/calculate`
  - `/api/public/rankings/demo`
- 校验响应结构中是否包含预期字段。
- 失败时输出明确错误并返回非 0 exit code。

### `package.json`

新增脚本：

- `smoke`: 运行 `node scripts/smoke_check.mjs`。
- `verify`: 运行 `node scripts/verify_local.mjs`，串联类型检查、生产构建、临时生产服务和 smoke check。

`smoke` 需要用户先启动本地服务；`verify` 不需要预启动服务，默认在 `3100` 端口启动临时生产服务。

## 验收流程

1. 安装依赖：`npm install`。
2. 运行完整验收：`npm run verify`。
3. 如只需快速检查运行中的服务，先启动服务：`npm run dev`，再新终端运行：`npm run smoke`。
4. 检查输出全部通过。
5. 如需生产模式验证，运行 `npm run build && npm run start` 后再运行 `npm run smoke`。

## 验收标准

- `npm run check` 通过。
- `npm run build` 通过。
- `python3` 可用。
- `/api/rankings/calculate` 能返回排名结果。
- `/api/public/rankings/demo` 能返回公开发布 payload。
- smoke check 返回 exit code 0。

## 错误处理

- 服务未启动时提示先运行 `npm run dev` 或 `npm run start`。
- `python3` 不可用时提示 Ranking Engine 依赖 Python 运行时。
- API 返回非 2xx 时输出状态码和响应内容。
- 响应结构不符合预期时输出具体缺失字段。

## 文档更新

- 新增 `docs/stage-6.md`。
- 同步新增 `mydocs/stage-6.md`。
- 更新 `README.md` 与 `mydocs/README.md`：
  - 当前阶段改为阶段 6。
  - 增加 `npm run smoke` 和 `npm run verify`。
  - 说明 `smoke` 需要先启动本地服务，`verify` 会自启动临时生产服务。
- 更新 `mydocs/HEMA排名网站代码生成记录与方案变化.md`。

## 后续衔接

- 如果后续要提升质量，可引入 Vitest 做 Repository/API 单元测试。
- 如果后续要验证真实用户路径，可引入 Playwright 做页面 E2E。
- 如果后续要上线，需要确认 Python 运行时、公开 iframe 绝对地址、Supabase 环境变量和部署目标。
