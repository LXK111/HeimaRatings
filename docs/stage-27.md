# 阶段 27：武器类型真实创建编辑闭环

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-30 | Codex | 创建阶段 27 执行记录，新增武器类型真实创建编辑闭环 |

## 范围

- 将武器类型管理从只读展示推进到可新增、可编辑、可启停。
- 为 Repository 增加 `createWeapon` 和 `updateWeapon` 写入接口。
- 为 Supabase Repository 增加 `weapon_types` insert/update 持久化路径。
- 为 Mock Repository 增加同接口实现，保证默认开发模式可编译运行。
- 为 `/api/weapons` 增加 `POST` 和 `PATCH` 管理写接口。
- 在 `/weapons` 页面增加新增表单和行内编辑表单。

## 非目标

- 不新增数据库 migration。
- 不实现删除武器类型。
- 不在本阶段扩展选手、赛事和比赛项目的创建编辑表单。
- 不改变公开榜单多武器快照模型。

## 实现记录

- 更新 `lib/server/repositories/types.ts`：
  - 新增 `CreateWeaponInput` 和 `UpdateWeaponInput`。
  - 扩展 `AppRepository` 的武器类型写入契约。
- 更新 `lib/server/repositories/supabase.ts`：
  - 新增 `createWeapon()` 和 `updateWeapon()`。
  - 写入时绑定当前 `organization_id`。
  - 对名称、slug、启用状态和排序做统一规范化。
- 更新 `lib/server/repositories/mock.ts`：
  - 补齐 Mock 模式下的武器类型创建和编辑接口。
- 更新 `app/api/weapons/route.ts`：
  - 保留登录后的 `GET` 读取路径。
  - 新增 `POST` 创建武器类型。
  - 新增 `PATCH` 编辑武器类型。
  - 写接口复用 `requireManagementApiWriteAccess()`，要求当前组织 `admin/editor`。
- 新增 `lib/server/weapon-actions.ts`：
  - 提供 `/weapons` 页面表单使用的 Server Actions。
  - 页面提交仍通过 Repository 写入，由 Supabase RLS 约束真实权限。
- 更新 `app/weapons/page.tsx`：
  - 增加新增武器类型表单。
  - 增加行内编辑表单，可修改名称、slug、排序和启用状态。

## 当前限制

- Mock Repository 的新增/编辑结果不会持久化，主要用于默认模式编译和本地 smoke。
- Supabase 模式下真实写入受当前登录用户组织成员角色和数据库 RLS 共同约束。
- 页面表单当前使用基础 Server Action 提交，暂未增加提交后的内联错误展示。

## 验证记录

- `git diff --check`：通过，无空白格式问题。
- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
