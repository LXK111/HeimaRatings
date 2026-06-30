# 阶段 23：用户 JWT Repository 与 RLS 接管

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-30 | Codex | 创建阶段 23 执行记录，管理端 Repository 切换用户 JWT client |

## 范围

- 管理端页面和管理 API 在 Supabase 登录保护开启时使用当前用户会话 client 访问数据库。
- 保留 service role Repository 给公开榜单、嵌入页、公开 API 和内部成员授权查询使用。
- `SupabaseRepository` 支持异步 Supabase client provider。
- 新增请求级 Repository 工厂，按数据源和认证配置选择 user scoped client 或原有 Repository。
- Mock 模式继续使用原有 Mock Repository，保障本地验收。

## 非目标

- 不新增数据库 migration。
- 不修改现有 RLS policy。
- 不实现注册、邀请和成员管理 UI。
- 不移除 service role 配置。
- 不改变公开榜单和嵌入页匿名访问。

## 实现记录

- 更新 `lib/server/supabase/client.ts`：
  - 新增 `createUserSupabaseClient()`，复用 `@supabase/ssr` Auth client。
- 更新 `lib/server/repositories/supabase.ts`：
  - Repository 构造函数支持传入 Supabase client provider。
  - 内部数据库访问改为延迟获取 client，兼容同步 service role client 和异步用户会话 client。
- 更新 `lib/server/repositories/factory.ts`：
  - 保留 `getRepository()` 作为 service role/Mock 基础工厂。
  - 新增 `getRequestRepository()`，管理请求在 Supabase Auth 开启时使用用户会话 client。
- 更新管理端页面：
  - 控制台、武器、选手、赛事、项目、比赛和排名页改用 `getRequestRepository()`。
- 更新管理 API：
  - 武器、选手、赛事、项目、比赛、排名快照和排名计算接口改用 `getRequestRepository()`。
- 保留公开访问路径：
  - 公开页、嵌入页和公开榜单 API 继续使用 `getRepository()`。
  - `organization-access` 内部成员查询继续使用 service role Repository。

## 当前限制

- 真库 RLS 行为需要在已登录浏览器会话下做端到端验收。
- 当前数据库 RLS policy 仍允许组织成员对核心表执行 all 操作，写权限角色差异仍由应用层 `admin/editor` 校验承担。
- service role 仍用于公开榜单读取和内部成员解析；后续可继续拆分更细的 public read Repository。

## 验证记录

- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
