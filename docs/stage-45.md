# 阶段 45：多武器公开页真库验收

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 45 执行记录，新增 Supabase 多武器公开页真库验收 |

## 目标

阶段 45 的目标是验证 Supabase 真库下“一个公开页关联多个武器快照”的模型确实可用。

公开页的核心不是 `public_pages.snapshot_id` 指向单个快照，而是通过 `public_page_snapshots` 同时关联长剑、军刀、迅捷剑等多个武器的最新快照。验收必须直接覆盖 API payload 和浏览器公开页展示。

## 范围

- 新增 `npm run public:verify`。
- 使用 Supabase service role 创建临时公开页、临时排名快照和 `public_page_snapshots` 关联。
- 验证公开 API 返回多个有排名数据的武器榜单。
- 验证浏览器公开页展示“武器切换”和多个武器入口。
- 验证结束后清理临时公开页和临时快照。

## 非目标

- 不修改生产 `demo` 公开页。
- 不依赖真实比赛记录重新计算排名。
- 不新增数据库迁移。
- 不修改公开页 UI。

## 实现记录

- 新增 `scripts/verify_public_multi_weapon_e2e.mjs`：
  - 读取 `.env.local` 和 `.env.database.local`。
  - 使用 `SUPABASE_SERVICE_ROLE_KEY` 在当前组织中创建临时公开页。
  - 为长剑、军刀、迅捷剑分别创建临时 `ranking_snapshots` 和 `ranking_snapshot_items`。
  - 写入 `public_page_snapshots`，验证多武器快照关联。
  - 构建并启动 Supabase 模式生产服务，验证 API 和浏览器公开页。
  - finally 清理临时公开页和临时快照。
- 更新 `package.json`，新增 `public:verify` 命令。

## 验证记录

- `node --check scripts/verify_public_multi_weapon_e2e.mjs`：通过，脚本语法无错误。
- `npm run public:verify`：通过，已验证临时多武器公开页 API、浏览器展示和临时数据清理。

## 边界与后续

- 验收脚本使用临时公开页，避免覆盖真实 `demo` 页面当前发布状态。
- 脚本要求当前组织至少存在长剑、军刀、迅捷剑和两个选手。
- 后续如果要验证真实 `demo` 页面，可增加显式环境变量让脚本切换为非临时页模式。
