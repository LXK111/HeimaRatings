# 阶段 13：公开页多武器快照模型

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-06-29 | Codex | 创建阶段 13 执行记录，记录公开页多武器快照模型改造 |

## 范围

- 新增 `public_page_snapshots` 表，让一个公开页可以按武器类型关联多个最新快照。
- 保留 `public_pages.snapshot_id` 作为旧模型兼容字段。
- 更新 Supabase Repository：
  - 发布快照时 upsert `public_page_snapshots(public_page_id, weapon_type_id)`。
  - 读取公开页时优先从 `public_page_snapshots` 组装 `rankingsByWeapon`。
  - 如果映射表暂无数据，则回退读取旧的 `public_pages.snapshot_id`。
- 保持 `PublicRankingPagePayload.rankingsByWeapon` 响应形态不变，避免公开页 UI 大改。

## 数据库变更

新增 migration：

```text
database/migrations/202606290001_public_page_snapshots.sql
```

新增表：

```text
public_page_snapshots
  id
  public_page_id
  weapon_type_id
  snapshot_id
  sort_order
  created_at
  updated_at
```

唯一约束：

```text
unique(public_page_id, weapon_type_id)
```

## 当前限制

- 真库需要手动执行 `database/migrations/202606290001_public_page_snapshots.sql` 后才能启用新模型。
- 当前环境没有 `DATABASE_URL` 或 `psql`，本次未直接迁移 Supabase 真库。
- 公开页 payload 仍只有单个 `algorithm` 和 `generatedAt` 字段；多武器算法/生成时间明细后续可在 payload 中增加 per-weapon metadata。
- 工作台发布目标仍固定为 `demo` 公开页。

## 验证记录

- `npm run check`：通过，TypeScript 无错误。
- `npm run build`：通过，Next.js 生产构建成功。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- Supabase 真库多武器验收：待执行 migration 后验证。
