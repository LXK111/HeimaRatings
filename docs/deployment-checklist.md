# HEMA Ratings 部署前检查清单

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建部署前检查清单，整理环境变量、迁移顺序和验收命令 |

## 目标

本清单用于部署前确认 HEMA Ratings 的运行形态、数据库结构、环境变量和验收命令。它不是新功能规格，而是上线前的操作闸门。

## 运行形态

- Web 运行时：Next.js App Router。
- 数据源：生产环境使用 Supabase，设置 `HEIMA_RATINGS_DATA_SOURCE=supabase`。
- 管理端认证：生产环境保持 `HEIMA_RATINGS_AUTH_REQUIRED=true`。
- Ranking Engine：当前通过 Node.js 子进程调用本仓库内 Python 算法，部署环境必须能执行 `python3`。

## Python Ranking Engine 风险

当前排名计算依赖 `python3` 命令。如果部署平台不支持从 Next.js 运行时调用 Python 子进程，排名计算接口会失败。

上线前必须二选一确认：

- 部署平台允许服务端运行 `python3`，并能访问 `rating-algorithm/` 与 `scripts/ranking_engine_runner.py`。
- 或者将 Ranking Engine 独立服务化，再调整 `lib/ranking-engine/adapter.ts` 的调用方式。

本阶段不临时重构算法服务，避免在部署前引入未经验证的新运行形态。

## Supabase DDL 执行顺序

按文件名顺序执行：

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/202606240001_initial_schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/202606290001_public_page_snapshots.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/202606290002_organization_integrity_constraints.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/202606290003_auth_rls_foundation.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/20260630044713_restrict_rls_write_roles.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/20260630124841_event_entries.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/20260701093112_bracket_slots.sql
```

初始演示数据按需执行：

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/202606240001_seed_core_data.sql
```

执行后验证：

```bash
npm run db:verify
```

## Vercel 环境变量

生产运行必需：

```bash
HEIMA_RATINGS_DATA_SOURCE=supabase
HEIMA_RATINGS_AUTH_REQUIRED=true
HEIMA_RATINGS_ORGANIZATION_SLUG=hema-ratings-demo
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

验收脚本需要：

```bash
HEIMA_RATINGS_RLS_VIEWER_EMAIL=...
HEIMA_RATINGS_RLS_VIEWER_PASSWORD=...
HEIMA_RATINGS_RLS_EDITOR_EMAIL=...
HEIMA_RATINGS_RLS_EDITOR_PASSWORD=...
HEIMA_RATINGS_RLS_ORGANIZATION_SLUG=hema-ratings-demo
HEIMA_RATINGS_RLS_PUBLIC_PAGE_ID=demo
```

不要把 `DATABASE_URL` 放到 Vercel，除非有明确服务端 SQL 直连需求。当前 `DATABASE_URL` 只用于本地执行 DDL 和 `npm run db:verify`。

## 本地部署前验收

不访问真库的一键检查：

```bash
npm run predeploy:verify
```

真库相关检查按需手动执行：

```bash
npm run db:verify
npm run auth:verify
npm run auth:api:verify
npm run auth:browser:verify
npm run ranking:supabase:verify
npm run bracket:slots:verify
npm run bracket:slots:advance:verify
npm run data:import:verify
npm run public:verify
```

## 上线后冒烟检查

- 访问公开页：`/public/rankings/demo`。
- 访问嵌入页：`/embed/rankings/demo?theme=compact&height=480`。
- editor 账号登录管理端。
- viewer 账号确认只读、写入被拒绝。
- 排名页执行一次项目级排名计算。
- 比赛录入页确认签表读取和公开页发布目标。
