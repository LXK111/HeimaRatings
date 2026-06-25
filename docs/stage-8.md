# 阶段 8：Supabase Repository 与比赛持久化

## 修改记录

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-25 | TRAE | 创建阶段 8 执行记录，记录 Supabase Repository 与比赛持久化代码实现 |
| v0.2 | 2026-06-25 | TRAE | 补充 API 统一错误响应修复和完整本地验收结果 |

## 范围

- 新增 Supabase SDK 依赖。
- 新增服务端 Supabase client 初始化模块。
- 实现 `SupabaseRepository` 的基础读取、比赛写入和 Ranking Engine 输入构造。
- 保持默认 Mock 数据源，避免本地验收依赖真实 Supabase 项目。
- 调整比赛录入页成功提示为不依赖数据源的中性文案。
- 当前阶段只持久化比赛事实数据，不保存正式排名快照。

## 实现内容

- `package.json` / `package-lock.json`：新增 `@supabase/supabase-js`。
- `lib/server/supabase/client.ts`：新增服务端 Supabase client，读取 `NEXT_PUBLIC_SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`。
- `lib/server/repositories/supabase.ts`：实现 Supabase 数据源读取、比赛写入、Ranking Engine 输入构造和公开页基础查询。
- `lib/server/api-response.ts`：新增服务端错误包装，确保 Supabase 缺配置时 API 返回统一 JSON 错误。
- `app/api/**/route.ts`：将仓储读取类接口纳入统一错误响应，比赛写入接口保留输入错误 400。
- `components/matches/match-workbench.tsx`：提交比赛成功后提示“比赛已保存并加入当前计算队列”。

## 数据源配置

默认 Mock：

```bash
HEIMA_RATINGS_DATA_SOURCE=mock
```

Supabase：

```bash
HEIMA_RATINGS_DATA_SOURCE=supabase
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

当前本地验收默认仍使用 Mock 模式。配置 Supabase 后，服务端 API 会通过 `SupabaseRepository` 读取和写入数据库。

## 当前限制

- 阶段 8 不保存 `ranking_snapshots`。
- 阶段 8 不把公开榜单切换为真实快照发布流。
- 阶段 8 不引入登录、权限、RLS 或多用户会话。
- 未配置真实 Supabase 环境时，只验证 Supabase 代码路径可编译，不做真库联调。

## 验证记录

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- `npm run smoke`：通过，使用默认 Mock 数据源验证关键 API、Ranking Engine 和公开榜单 API。
- Supabase 缺配置错误路径：通过，`HEIMA_RATINGS_DATA_SOURCE=supabase` 且未配置 URL/Key 时 API 返回 `{ error: { message } }` JSON。
