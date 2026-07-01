# 阶段 59：公开页和嵌入页生产化细节

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 59 执行记录，补充公开页 metadata、嵌入参数和管理端公开页入口 |

## 目标

阶段 59 的目标是让公开榜单和 iframe 嵌入页具备部署前可分享、可嵌入、可验收的生产化细节。

公开页的本质是外部访问入口，不只是管理端内部页面。因此本阶段优先补 SEO metadata、iframe 参数化和管理端可复制入口，而不是扩展公开页 CRUD。

## 范围

- `/public/rankings/[pageId]` 新增动态 metadata。
- 公开页不可用时返回明确的不可用 metadata。
- `/embed/rankings/[pageId]` 设置 `robots: noindex, nofollow`。
- 公开页 iframe 代码新增 `weapon`、`theme` 和 `height` 参数。
- 嵌入页支持 `theme=dark|light|compact` 和 `height=480|640|800`。
- 排名管理页新增当前组织公开页发布入口，展示公开链接、iframe 代码、pageId、主题和启用状态。
- 扩展 `npm run public:verify`，覆盖 metadata、iframe 参数和 compact 嵌入页访问。

## 非目标

- 不新增公开页创建/编辑表单。
- 不新增公开页权限模型。
- 不改变公开页数据库结构。
- 不做项目级榜单公开展示。

## 实现记录

- 更新 `app/public/rankings/[pageId]/page.tsx`，新增 `generateMetadata()` 和 iframe 配置参数。
- 更新 `app/embed/rankings/[pageId]/page.tsx`，新增 noindex metadata、主题和高度参数。
- 更新 `app/tournaments/[id]/rankings/page.tsx`，新增公开页发布入口。
- 更新 `scripts/verify_public_multi_weapon_e2e.mjs`，验证公开页 metadata、iframe 参数和嵌入页。
- 更新 `README.md` 当前阶段、已完成阶段、阶段边界和后续阶段。
- 更新 `docs/HEMA排名网站代码生成记录与方案变化.md`，记录阶段 59。

## 验证记录

- `node --check scripts/verify_public_multi_weapon_e2e.mjs`：通过，脚本语法无错误。
- `npm run public:verify`：通过，真库多武器公开页、metadata、iframe 参数、compact 嵌入页和临时数据清理均通过。
- `npm run check`：通过，TypeScript 类型检查无错误。
- `git diff --check`：通过，当前变更无空白格式问题。

## 边界与后续

- 当前阶段提供公开页列表和复制入口，不提供公开页管理 CRUD。
- 公开页仍展示分武器公开榜单，不展示项目级榜单。
- 下一步建议推进阶段 60：部署前运行形态收口。
