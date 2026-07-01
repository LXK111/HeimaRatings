# 阶段 39：公开页发布目标选择

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 39 执行记录，新增公开页发布目标选择 |

## 范围

- 比赛录入页发布公开榜单时支持选择公开页目标。
- Repository 新增当前组织公开页摘要列表读取能力。
- Mock 模式保留 `demo` 公开页作为默认目标。
- Supabase 模式从 `public_pages` 读取当前组织已启用公开页。
- 发布请求继续复用 `/api/rankings/calculate`，通过 `publishPageId` 指定目标页。

## 非目标

- 不新增公开页创建和编辑页面。
- 不改变公开页多武器快照模型。
- 不让公开页展示项目级榜单。
- 不改排名计算和快照保存规则。
- 不引入浏览器自动化验收。

## 实现记录

- 更新 `lib/domain/types.ts`，新增 `PublicRankingPageSummary`。
- 更新 `lib/server/repositories/types.ts`，新增 `listPublicRankingPages()` Repository 契约。
- 更新 `lib/server/mock-repository.ts` 和 `lib/server/repositories/mock.ts`，为 Mock 模式返回 `demo` 公开页摘要。
- 更新 `lib/server/repositories/supabase.ts`，按当前组织读取已启用公开页摘要。
- 更新 `app/tournaments/[id]/matches/page.tsx`，服务端加载公开页列表并传入比赛工作台。
- 更新 `components/matches/match-workbench.tsx`，维护当前发布目标并将 `publishPageId` 写入发布请求。
- 更新 `components/matches/ranking-control-panel.tsx`，新增发布目标选择控件，并在发布成功后显示对应公开页路径。

## 当前限制

- 当前阶段只消费已有公开页，不提供新建公开页入口。
- Supabase 模式只展示已启用公开页；如果组织没有公开页，页面会回退到 `demo` 目标并由现有发布逻辑创建或更新。
- 发布目标选择只影响赛事级公开榜单，项目级快照仍不进入公开页。

## 验证记录

- `git diff --check`：通过，无空白格式问题。
- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
