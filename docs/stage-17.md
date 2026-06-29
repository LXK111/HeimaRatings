# 阶段 17：真库组织隔离验收脚本

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-29 | Codex | 创建阶段 17 执行记录，新增真库组织隔离验收脚本 |
| v0.2 | 2026-06-29 | Codex | 补充本地验证结果和真库执行前置条件 |
| v0.3 | 2026-06-29 | Codex | 支持从 `.env.database.local` 读取真库连接串 |
| v0.4 | 2026-06-29 | Codex | 补充用户本地真库验收执行成功状态 |

## 范围

- 增加可重复执行的真库数据库约束验收 SQL。
- 增加 `npm run db:verify` 命令，统一调用 `psql` 执行验收。
- 验收脚本使用事务内临时数据，执行结束 `rollback`，不持久化测试数据。
- 覆盖阶段 16 的核心数据库不变量。

## 非目标

- 不替代应用层 `npm run verify`。
- 不在没有 `DATABASE_URL` 的环境连接真库。
- 不接入 Supabase CLI。
- 不新增 RLS 或认证逻辑。

## 实现记录

- 新增 `database/validations/202606290003_verify_organization_integrity.sql`。
- 新增 `scripts/verify_database_constraints.mjs`。
- `package.json` 新增脚本：

```bash
npm run db:verify
```

验收 SQL 会检查：

- `public_pages_organization_id_page_id_key` 约束存在。
- 阶段 16 的 7 个组织隔离 trigger 存在。
- 阶段 16 的关键复合索引存在。
- 同一 `page_id` 可在不同组织分别创建公开页。
- 正常同组织链路可以写入选手积分、赛事项目、比赛、排名快照、快照明细、公开页和公开页武器快照映射。
- 跨组织选手积分、赛事项目、比赛、排名快照、快照明细、公开页和公开页武器快照映射会被数据库拒绝。

## 执行方式

需要本机安装 `psql`，并提供真库连接：

```bash
DATABASE_URL="postgresql://..." npm run db:verify
```

也可以在项目根目录创建不提交的 `.env.database.local`：

```bash
DATABASE_URL="postgresql://..."
```

然后直接执行：

```bash
npm run db:verify
```

如果 shell 已经设置了 `DATABASE_URL`，脚本会优先使用 shell 环境变量。

## 当前限制

- 当前本机环境没有 `psql`，所以本阶段只能验证脚本、构建和默认 Mock 闭环。
- 真库约束验收需要在具备 `DATABASE_URL` 和 `psql` 的环境执行。
- 脚本验证的是数据库一致性约束，不覆盖登录权限和 RLS。

## 验证记录

- `git diff --check`：通过，无空白格式问题。
- `npm run db:verify` 缺配置路径：通过，未配置 `DATABASE_URL` 时明确提示 `DATABASE_URL is required to verify database constraints.`。
- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- 真库 `db:verify`：已由用户在本地数据库连接环境执行成功。
