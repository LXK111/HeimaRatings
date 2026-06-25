# 阶段 5：公开榜单与嵌入页

## 修改记录

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-25 | TRAE | 创建阶段 5 执行记录，记录公开榜单发布展示闭环实现 |
| v0.2 | 2026-06-25 | TRAE | 补充阶段 5 验证结果 |

## 范围

- 扩展公开榜单 API，返回公开页面配置、多武器榜单、公开链接、嵌入链接和 iframe 代码。
- 改造公开榜单页，支持武器切换、发布状态展示和 iframe 代码展示。
- 改造嵌入页，支持通过 `weapon` query 指定武器并使用紧凑只读布局。
- 当前阶段继续使用 Mock Repository，不接入 Supabase，不实时计算公开榜单。

## 实现内容

- `lib/domain/types.ts`：新增 `PublicRankingPagePayload`。
- `lib/server/mock-repository.ts`：扩展 `getPublicRankingPage()`，返回发布展示闭环所需 payload。
- `app/api/public/rankings/[pageId]/route.ts`：公开 API 支持页面不存在时返回 404。
- `app/public/rankings/[pageId]/page.tsx`：公开页展示发布状态、算法、生成时间、武器切换、排名榜、公开链接和 iframe 代码。
- `app/embed/rankings/[pageId]/page.tsx`：嵌入页支持 `?weapon=...` 并使用紧凑榜单布局。

## 数据流

1. 用户访问 `/public/rankings/demo` 或 `/embed/rankings/demo`。
2. 页面读取 `pageId` 和可选 `weapon` query。
3. 页面从 Mock Repository 获取公开榜单 payload。
4. 页面选择 query 指定武器；如果无效则回退默认武器。
5. 公开页展示完整发布信息，嵌入页展示紧凑排名榜。

## 当前限制

- 不保存新的 `ranking_snapshots`。
- 不实时调用 Ranking Engine。
- 公开数据仍来自 Mock Repository。
- iframe 代码使用相对路径，部署到真实域名后需要根据部署域名补全绝对地址。

## 验证记录

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `/api/public/rankings/demo`：通过，返回公开发布 payload。
- `/api/public/rankings/missing`：通过，返回 404。
- `/public/rankings/demo?weapon=weapon-sabre`：通过，页面包含发布状态和 iframe 嵌入代码。
- `/embed/rankings/demo?weapon=weapon-sabre`：通过，页面包含军刀榜单数据。
- `/public/rankings/demo?weapon=bad`：通过，页面可回退展示公开榜单。
