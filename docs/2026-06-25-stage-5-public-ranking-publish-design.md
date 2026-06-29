# 阶段 5：公开榜单与嵌入页发布展示闭环设计

## 修改记录

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-25 | TRAE | 创建阶段 5 设计规格，确认采用发布展示闭环方案 |

## 目标

阶段 5 验证排名能力能否被外部用户访问和嵌入。核心不是数据库持久化，也不是公开页实时计算，而是让一个公开榜单具备可访问 URL、iframe 嵌入 URL、武器切换和只读展示能力。

## 范围

- 扩展公开榜单 API 返回发布配置和多武器榜单数据。
- 改造 `/public/rankings/[pageId]` 为完整公开榜单页。
- 改造 `/embed/rankings/[pageId]` 为适合 iframe 的紧凑榜单页。
- 支持通过 URL query 指定武器类型。
- 在公开页展示 iframe 嵌入代码。
- 新增阶段 5 执行文档并更新 README 与总记录文档。

## 非目标

- 不接入 Supabase。
- 不保存新的 `ranking_snapshots`。
- 不让公开页实时调用 Ranking Engine。
- 不实现权限管理、访问统计或自定义域名。
- 不实现外部业务上传自有数据。

## 推荐方案

采用发布展示闭环：

- 数据仍来自 Mock Repository 中的公开页面和排名快照语义。
- API 返回一个自包含的公开页面 payload。
- 公开页负责完整展示和发布说明。
- 嵌入页负责紧凑只读展示。
- 后续阶段可把 Mock Repository 替换为 Supabase Repository，页面结构不需要大改。

## 数据结构

`/api/public/rankings/[pageId]` 返回：

- `pageId`
- `title`
- `enabled`
- `theme`
- `defaultWeaponTypeId`
- `weapons`
- `rankingsByWeapon`
- `algorithm`
- `generatedAt`
- `publicUrl`
- `embedUrl`
- `iframeCode`

其中 `rankingsByWeapon` 以 `weaponTypeId` 为 key，value 为当前武器的排名行数组。

## 页面设计

### 公开页

路径：`/public/rankings/[pageId]`

能力：

- 显示公开榜单标题。
- 显示算法、生成时间、默认武器和发布状态。
- 支持切换武器查看不同排名池。
- 展示选中武器的排名榜。
- 展示公开链接、嵌入链接和 iframe 代码。
- 当页面禁用或不存在时展示不可用状态。

### 嵌入页

路径：`/embed/rankings/[pageId]`

能力：

- 使用紧凑布局，适合 iframe。
- 支持 `?weapon=weapon-longsword` 指定武器。
- 不展示管理说明和复杂操作。
- 当武器不存在时回退默认武器。

## 数据流

1. 用户访问公开页或嵌入页。
2. 页面读取 `pageId` 和可选 `weapon` query。
3. 页面调用 Mock Repository 或公开 API 获取公开榜单 payload。
4. 页面选择默认武器或 query 指定武器。
5. 页面渲染对应武器排名。
6. 公开页额外展示可复制的发布链接和 iframe 代码。

## 错误处理

- `pageId` 无效时展示榜单不可用。
- `enabled=false` 时展示榜单已关闭。
- `weapon` query 不存在或未启用时回退默认武器。
- 某武器没有排名数据时展示空榜单说明。

## 验证

- `npm run check`。
- `npm run build`。
- 验证 `/api/public/rankings/demo` 返回公开发布 payload。
- 验证 `/public/rankings/demo` 可展示公开榜单和 iframe 代码。
- 验证 `/embed/rankings/demo?weapon=weapon-sabre` 可展示军刀紧凑榜单。
- 验证无效武器 query 会回退默认武器。

## 后续衔接

- 阶段 6 可补充接口测试和页面回归测试。
- 后续接入 Supabase 后，公开 payload 可从 `public_pages`、`ranking_snapshots` 和 `ranking_snapshot_items` 读取。
- 后续可增加外部业务数据上传和多组织公开页隔离能力。
