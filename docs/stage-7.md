# 阶段 7：仓储抽象与持久化边界

## 修改记录

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-25 | TRAE | 创建阶段 7 执行记录，记录仓储抽象优先实现 |
| v0.2 | 2026-06-25 | TRAE | 补充阶段 7 验证结果 |

## 范围

- 新增 Repository 接口，统一 API 和公开展示页的数据访问边界。
- 新增 `MockRepository`，保持当前 Mock 数据行为不变。
- 新增 `SupabaseRepository` 骨架，预留后续真实 Supabase 读写能力。
- 新增 `getRepository()` 工厂，通过环境变量选择数据源。
- 迁移 API 路由、公开榜单页和嵌入榜单页到 Repository 工厂。
- 当前阶段不连接真实 Supabase，不引入登录和 RLS。

## 实现内容

- `lib/server/repositories/types.ts`：定义 `AppRepository`、比赛创建输入、Ranking Engine 输入构造选项和快照创建输入。
- `lib/server/repositories/mock.ts`：封装现有 Mock 数据访问能力，作为默认数据源。
- `lib/server/repositories/supabase.ts`：新增 Supabase 数据源骨架，缺少环境变量时给出明确错误。
- `lib/server/repositories/factory.ts`：新增仓储工厂，默认使用 Mock，支持通过 `HEIMA_RATINGS_DATA_SOURCE=supabase` 切换。
- `app/api/**/route.ts`：API 路由改为通过仓储接口读取和写入业务数据。
- `app/public/rankings/[pageId]/page.tsx`：公开榜单页改为通过仓储读取公开榜单 payload。
- `app/embed/rankings/[pageId]/page.tsx`：嵌入榜单页改为通过仓储读取公开榜单 payload。

## 环境变量

默认数据源：

```bash
HEIMA_RATINGS_DATA_SOURCE=mock
```

Supabase 数据源预留配置：

```bash
HEIMA_RATINGS_DATA_SOURCE=supabase
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

当前阶段即使配置 Supabase 数据源，也只会进入骨架校验；真实查询和写入留到后续阶段实现。

## 当前限制

- `MockRepository.createMatch()` 仍返回草稿比赛，不写入持久化存储。
- `MockRepository.createRankingSnapshot()` 不保存真实快照。
- `SupabaseRepository` 只完成骨架和环境变量校验，尚未实现真实 SQL 查询。
- 管理端页面仍主要使用现有静态/Mock 展示路径，阶段 7 只迁移 API 和公开展示页的数据源边界。

## 验证记录

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `npm run smoke`：通过，已验证 Repository 工厂默认 Mock 数据源下的关键 API、Ranking Engine 和公开榜单 API。
- `npm run verify`：通过，已自动执行 `check`、`build`，临时启动 `http://localhost:3100`，执行 smoke check 并关闭临时服务。
