# 阶段 28：选手真实创建编辑闭环

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-30 | Codex | 创建阶段 28 执行记录，新增选手真实创建编辑闭环 |

## 范围

- 将选手管理从只读展示推进到可新增、可编辑。
- 为 Repository 增加 `createPlayer` 和 `updatePlayer` 写入接口。
- 为 Supabase Repository 增加 `players` insert/update 持久化路径。
- 新增选手时，为当前组织已启用武器类型初始化 `player_weapon_ratings`。
- 为 `/api/players` 增加 `POST` 和 `PATCH` 管理写接口。
- 在 `/players` 页面增加新增表单和行内编辑表单。

## 非目标

- 不新增数据库 migration。
- 不实现选手删除。
- 不实现批量导入。
- 不做赛事报名、签表或淘汰晋级。
- 不在编辑选手资料时调整已有积分。

## 实现记录

- 更新 `lib/server/repositories/types.ts`：
  - 新增 `CreatePlayerInput` 和 `UpdatePlayerInput`。
  - 扩展 `AppRepository` 的选手写入契约。
- 更新 `lib/server/repositories/supabase.ts`：
  - 新增 `createPlayer()` 和 `updatePlayer()`。
  - 新增选手时绑定当前 `organization_id`。
  - 新增选手后按启用武器初始化分武器积分。
- 更新 `lib/server/repositories/mock.ts`：
  - 补齐 Mock 模式下的选手创建和编辑接口。
- 更新 `app/api/players/route.ts`：
  - 保留登录后的 `GET` 读取路径。
  - 新增 `POST` 创建选手。
  - 新增 `PATCH` 编辑选手。
  - 写接口复用 `requireManagementApiWriteAccess()`，要求当前组织 `admin/editor`。
- 新增 `lib/server/player-actions.ts`：
  - 提供 `/players` 页面表单使用的 Server Actions。
  - 页面提交仍通过 Repository 写入，由 Supabase RLS 约束真实权限。
- 更新 `app/players/page.tsx`：
  - 增加新增选手表单。
  - 增加行内编辑表单，可修改姓名和俱乐部。

## 当前限制

- Mock Repository 的新增/编辑结果不会持久化，主要用于默认模式编译和本地 smoke。
- Supabase 模式下真实写入受当前登录用户组织成员角色和数据库 RLS 共同约束。
- 页面表单当前使用基础 Server Action 提交，暂未增加提交后的内联错误展示。
- 初始积分只在创建选手时用于初始化已启用武器的分武器积分；编辑选手资料不会改动已有 rating。

## 验证记录

- `git diff --check`：通过，无空白格式问题。
- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
