# 阶段 6：测试、部署与验收

## 修改记录

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-25 | TRAE | 创建阶段 6 执行记录，记录本地验收闭环实现 |
| v0.2 | 2026-06-25 | TRAE | 将 `verify` 调整为自启动生产服务的完整本地验收命令 |

## 范围

- 新增本地 smoke check 脚本。
- 新增 `npm run smoke` 和 `npm run verify` 验收命令。
- 明确本地验收流程、通过标准和已知限制。
- 当前阶段不引入测试框架，不接入真实云部署平台。

## 实现内容

- `scripts/smoke_check.mjs`：新增本地 smoke check，检查 Node、npm、Python 运行时，并验证关键 API。
- `scripts/verify_local.mjs`：新增完整本地验收脚本，串联类型检查、生产构建、临时生产服务和 smoke check。
- `package.json`：新增 `smoke` 和 `verify` 脚本，其中 `verify` 不依赖外部预启动服务。
- `README.md`：补充阶段 6 状态和验收命令说明。
- `mydocs/README.md`：同步 README 更新。
- `mydocs/HEMA排名网站代码生成记录与方案变化.md`：补充阶段 6 执行记录。

## 验收命令

快速 smoke 验收：

```bash
npm install
npm run dev
```

在另一个终端执行：

```bash
npm run smoke
```

完整本地验收：

```bash
npm run verify
```

生产模式手动 smoke 验收：

```bash
npm run build
npm run start
```

在另一个终端执行：

```bash
npm run smoke
```

## Smoke Check 范围

- `node --version`
- `npm --version`
- `python3 --version`
- `GET /api/weapons`
- `GET /api/tournaments`
- `POST /api/rankings/calculate`
- `GET /api/public/rankings/demo`

## 通过标准

- TypeScript 检查通过。
- Next.js 生产构建通过。
- 本机 `python3` 可用。
- Ranking Engine 能返回排名结果。
- 公开榜单 API 能返回发布 payload。
- `npm run smoke` 返回 exit code 0。

## 当前限制

- `npm run smoke` 需要本地服务已经启动，默认检查 `http://localhost:3000`。
- `npm run verify` 会临时启动生产服务，默认使用 `http://localhost:3100`，可通过 `HEIMA_RATINGS_VERIFY_PORT` 覆盖端口。
- 当前仍使用 Mock Repository。
- 当前不接入 Supabase，不保存真实排名快照。
- 当前未引入 Vitest、Playwright 等测试框架。
- 真实部署前仍需要确认 Python 运行时、公开 iframe 绝对地址、Supabase 环境变量和部署目标。

## 验证记录

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `npm run smoke`：通过，已验证 `node`、`npm`、`python3`、武器 API、赛事 API、Ranking Engine 和公开榜单 API。
- `npm run verify`：通过，已自动完成 TypeScript 检查、生产构建、临时启动 `http://localhost:3100`、执行 smoke check 并关闭临时服务。
