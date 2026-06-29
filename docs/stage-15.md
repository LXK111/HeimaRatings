# 阶段 15：多组织数据隔离基线

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-29 | Codex | 创建阶段 15 执行记录，记录 Supabase Repository 的组织级数据隔离基线 |
| v0.2 | 2026-06-29 | Codex | 补充本地构建、Mock 验收和 Supabase 只读 API 验证结果 |

## 范围

- 为 Supabase Repository 增加当前组织上下文。
- 当前组织通过 `HEIMA_RATINGS_ORGANIZATION_SLUG` 解析，未配置时默认使用 `hema-ratings-demo`。
- 将管理端和公开页依赖的 Supabase 读写路径限制到当前组织。
- 保持 MockRepository 行为不变，继续作为默认本地数据源。

## 非目标

- 不引入登录态、租户选择器或成员权限模型。
- 不在本阶段开启 Supabase RLS。
- 不改造数据库唯一约束，例如 `public_pages.page_id` 当前仍是全局唯一。
- 不实现组织管理后台。

## 实现记录

- `SupabaseRepository` 新增组织解析缓存，启动后按 slug 查询 `organizations` 表。
- `listWeapons()`、`listPlayers()`、`listTournaments()` 改为只读取当前组织数据。
- 赛事详情、比赛项目、比赛列表、比赛写入、排名计算输入和排名快照创建均增加组织边界校验。
- 选手加载统一经由 `loadPlayersByIds()`，并限制在当前组织内，避免快照或积分记录跨组织回显选手资料。
- 公开页读取改为 `organization_id + page_id` 双条件查询。
- 公开页创建和更新使用当前组织 ID，发布多武器快照时校验武器属于当前组织。
- 排名计算输入在传入 `eventId` 时校验项目同时属于当前赛事和当前武器。

## 当前限制

- 这是应用层 Repository 隔离，不替代数据库 RLS。
- `public_pages.page_id` 的数据库唯一约束仍是全局级别，多组织同名公开页需要后续迁移为 `organization_id + page_id` 复合唯一。
- `player_weapon_ratings`、`ranking_snapshots` 等表本身没有 `organization_id` 字段，本阶段通过选手、武器和赛事归属间接隔离。
- 当前组织来自环境变量，后续接入认证后应由登录身份或请求上下文决定。

## 验证记录

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- Supabase 只读 API 验证：通过，`/api/weapons`、`/api/players`、`/api/tournaments`、`/api/public/rankings/demo` 均返回 200，并返回当前组织数据。
