# 阶段 20：组织切换与上下文可视化

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-29 | Codex | 创建阶段 20 执行记录，新增组织切换与上下文可视化 |
| v0.2 | 2026-06-29 | Codex | 补充构建和 Mock 一键验收结果 |

## 范围

- 在管理端 Shell 中展示当前组织和组织来源。
- 新增组织切换表单，将组织 slug 写入 `heima_organization_slug` cookie。
- Repository 新增组织列表读取能力。
- MockRepository 提供 demo 组织列表，保持本地开发闭环。
- 公开榜单页面隐藏组织切换入口。

## 非目标

- 不实现登录 UI。
- 不验证当前用户是否属于被切换的组织。
- 不把 Repository 切换到用户 JWT。
- 不做组织成员管理页面。

## 实现记录

- `AppShell` 改为 async Server Component，读取请求级组织上下文和组织列表。
- `AppShell` 新增组织状态区域：
  - 当前组织 slug。
  - 组织来源：请求上下文、环境变量或默认组织。
  - 组织切换下拉框。
- 新增 server action `switchOrganization()`：
  - 写入 `heima_organization_slug` cookie。
  - 清理 `heima_organization_id` cookie。
  - 触发 layout revalidate。
- `AppRepository` 新增 `listOrganizations()`。
- `SupabaseRepository` 从 `organizations` 表读取组织列表。
- `MockRepository` 返回 demo 组织。
- 公开榜单页通过 `showOrganizationSwitcher={false}` 隐藏组织切换。

## 当前限制

- 当前组织切换是开发期/管理期能力，尚未绑定登录用户成员关系。
- service role 仍可读取全部组织；用户级授权留到后续阶段。
- 多组织真实数据需要先在 Supabase 中创建多个 `organizations` 及对应业务数据。

## 验证记录

- `npm run check`：通过，TypeScript 无错误。
- `git diff --check`：通过，无空白格式问题。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
