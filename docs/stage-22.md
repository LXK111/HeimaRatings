# 阶段 22：成员组织授权收敛

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-30 | Codex | 创建阶段 22 执行记录，接入成员组织过滤和写权限校验 |

## 范围

- 管理端组织上下文从“信任请求 cookie/header”收敛为“按当前登录用户的 `organization_members` 成员关系授权”。
- 组织切换列表只展示当前用户所属组织。
- 组织切换 server action 重新校验成员关系，拒绝非成员组织 slug。
- 管理 API 读取当前组织时使用授权后的上下文。
- 比赛写入和排名快照持久化要求当前组织角色为 `admin` 或 `editor`。
- Mock 模式继续免登录、免成员限制，保障本地验收。

## 非目标

- 不实现注册、邀请和成员管理 UI。
- 不把 Repository 切换到用户 JWT。
- 不改写数据库 RLS 策略。
- 不新增 Supabase migration。
- 不改变公开榜单和嵌入页匿名访问。

## 实现记录

- 新增领域类型：
  - `OrganizationRole`
  - `OrganizationMembership`
- 扩展 `AppRepository`：
  - 新增 `listUserOrganizationMemberships(userId)`。
- 更新 `SupabaseRepository`：
  - 从 `organization_members` 查询当前用户成员关系。
  - 关联 `organizations` 输出组织名称、slug 和角色。
- 更新 `MockRepository`：
  - 返回 demo 组织的 `admin` 成员关系。
- 新增 `lib/server/organization-access.ts`：
  - 将请求组织上下文解析为当前用户可访问组织。
  - 非成员组织不再回退到默认组织。
  - 提供 `readAuthorizedRepositoryContextFromRequest()` 给管理 API 使用。
  - 提供 `canWriteOrganization()` 统一判断写权限。
- 更新 `lib/server/request-context.ts`：
  - Server Page 获取组织上下文时自动做成员授权。
- 更新 `lib/server/auth-guard.ts`：
  - 新增 `requireManagementApiWriteAccess()`。
  - 写权限不足时返回 403。
- 更新 `AppShell`：
  - 组织切换下拉列表改为成员组织列表。
  - 当前组织来源显示为“成员授权”。
  - 切换组织时在 server action 中重新校验成员关系。
- 更新管理 API：
  - 读接口使用授权组织上下文。
  - `POST /api/tournaments/[id]/matches` 要求 `admin` 或 `editor`。
  - `POST /api/rankings/calculate` 在 `persistSnapshot: true` 时要求 `admin` 或 `editor`。

## 当前限制

- 服务端 Repository 仍使用 service role，数据库 RLS 不会限制这条服务端路径。
- 成员授权目前在 Next.js 服务端应用层完成。
- 用户没有任何组织成员关系时，管理端会抛出无组织成员错误；后续需要增加空状态和邀请入口。
- `viewer` 仍可访问管理读接口，但不能写入比赛或持久化排名快照。

## 验证记录

- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
