# 阶段 11：榜单发布操作闭环

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-29 | Codex | 创建阶段 11 执行记录，记录比赛工作台发布公开榜单操作闭环 |
| v0.2 | 2026-06-29 | Codex | 补充 Supabase 模式页面发布操作验收结果 |

## 范围

- 在比赛工作台新增“发布公开榜单”按钮。
- 保留“重新计算排名”的临时计算语义，不自动写入正式快照。
- 发布时调用 `/api/rankings/calculate`，传入 `persistSnapshot: true` 和 `publishPageId: "demo"`。
- 发布成功后展示最新快照 ID、生成时间和公开页路径。
- 修正比赛录入提示，区分 Supabase 模式真实写库和 Mock 模式页面临时状态。

## 非目标

- 不新增新的后端表结构。
- 不重构公开页和嵌入页路由。
- 不在本阶段拆分 `match-workbench.tsx` 大组件。
- 不实现多公开页管理、权限、RLS 或多组织发布工作流。

## 数据流

1. 管理员录入比赛。
2. 页面保存比赛；Supabase 模式写入 `matches`，Mock 模式保留在当前页面。
3. 管理员点击“重新计算排名”，页面展示本次临时计算结果。
4. 管理员确认后点击“发布公开榜单”。
5. 页面调用 `/api/rankings/calculate`，要求服务端持久化快照并发布到 `demo` 公开页。
6. API 返回 `result`、`snapshot` 和 `publishPageId`。
7. 页面更新展示结果，并显示快照 ID 与公开页路径。

## 当前限制

- 发布目标暂时固定为 `demo` 公开页。
- Mock 模式下发布只走非持久化占位快照；真实发布需要 Supabase 模式。
- 当前工作台仍使用阶段 4 的大组件结构，后续需要拆分表单、比赛列表、计算结果和发布状态。
- 发布按钮要求先有一次页面计算结果，避免误触空发布。

## 验证记录

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。

### Supabase 页面操作验收

- 本地以 `.env.local` 的 Supabase 模式启动 `npm run dev -- -p 3002`。
- 访问 `/tournaments/demo/matches`：通过，页面展示“计算与发布排名”和“发布公开榜单”。
- 点击“重新计算排名”：通过，页面完成当前赛事长剑排名计算。
- 点击“发布公开榜单”：通过，页面展示“公开榜单已发布”和 `/public/rankings/demo`。
- 发布操作实际调用 `/api/rankings/calculate`，服务端返回 200 并生成新公开快照。
