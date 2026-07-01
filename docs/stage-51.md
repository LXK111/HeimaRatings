# 阶段 51：bracket_slots 签位模型数据库基础

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 51 执行记录，新增 bracket_slots 签位模型数据库基础 |

## 目标

阶段 51 的目标是把签位从隐式推导推进到可持久化、可约束、可验收的数据模型。

当前 MVP 已能通过 `matches` 和参赛名单推导首轮轮空、pending bye 和晋级候选。这个方式能跑通流程，但不能稳定审计“选手原始签位、轮空签位、晋级来源和落位”。`bracket_slots` 的本质作用是记录签表位置，而不是替代真实比赛记录。

## 范围

- 新增 `bracket_slots` 表。
- 支持按项目、轮次和签位序号唯一定位一个 slot。
- 支持 `empty`、`occupied`、`bye`、`advanced` 四种签位状态。
- 支持用 `player_id` 表示选手落位，用 `source_match_id` 表示晋级来源。
- 增加数据库约束和 trigger，保证 slot 的选手、来源比赛和项目不跨组织、不跨项目。
- 增加 RLS policy，沿用组织成员可读、`admin/editor` 可写的权限模型。
- 增加 validation SQL，纳入 `npm run db:verify` 顺序验收。
- 增加 `BracketSlotRow` 数据库类型。

## 非目标

- 不改签表生成逻辑。
- 不改比赛录入页 UI。
- 不迁移既有 `matches` 数据。
- 不把轮空写入 Ranking Engine 输入。
- 不新增项目级公开榜单。

## 实现记录

- 新增 `database/migrations/20260701093112_bracket_slots.sql`：
  - 创建 `bracket_slots` 表。
  - 创建 `event_id + round + slot_index` 唯一约束。
  - 创建常用索引。
  - 创建 `assert_bracket_slot_scope()` trigger，限制 player/source match 与 event 同范围。
  - 创建 `bracket_slots_member_*` RLS policy。
- 新增 `database/validations/202607010002_verify_bracket_slots.sql`：
  - 验证表、索引、trigger 和 policy 存在。
  - 验证重复 slot 被拒绝。
  - 验证跨组织 player 被拒绝。
  - 验证跨 event source match 被拒绝。
  - 验证 viewer 不能写，editor 可以写改删。
- 更新 `lib/database/types.ts`，新增 `BracketSlotRow`。

## 验证记录

- 真库 migration 执行：通过，已执行 `database/migrations/20260701093112_bracket_slots.sql`。
- `npm run check`：通过，TypeScript 类型检查无错误。
- `npm run db:verify`：通过，包含阶段 51 `bracket_slots` validation。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，Mock 模式完整本地验收通过。
- `git diff --check`：通过，当前变更无空白格式问题。

## 边界与后续

- 当前阶段只建立数据库基础，现有签表生成仍继续使用 `matches`。
- 下一阶段可把首轮签表生成写入 `bracket_slots`，再让页面从 slot 模型读取固定签位和轮空状态。
