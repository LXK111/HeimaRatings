# 阶段 52：签表生成写入 bracket_slots

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 52 执行记录，新增初始签表生成写入 bracket_slots |

## 目标

阶段 52 的目标是让初始签表生成同时写入真实比赛和签位模型。

阶段 51 已建立 `bracket_slots` 数据库基础，但现有生成逻辑仍只写 `matches`。从业务本质看，`matches` 表示真实比赛，`bracket_slots` 表示签表位置。轮空不是比赛，因此本阶段把轮空写入 slot，而不是创建虚拟 match。

## 范围

- Supabase Repository 生成初始签表时同步写入 `bracket_slots`。
- Mock Repository 生成初始签表时同步写入内存 slot 数据。
- 单败淘汰项目按当前配对算法生成首轮 slot：
  - 真实对阵选手写入相邻 `occupied` slots。
  - 奇数人数未配对选手写入 `bye` slot。
- 已有 `matches` 或已有 `bracket_slots` 时拒绝重复生成。
- 新增 Supabase 真库验收脚本，覆盖 viewer 拒绝、editor 生成、slot 数量、bye 和真实 match 数量。

## 非目标

- 不改签表页面读取逻辑。
- 不改晋级落位逻辑。
- 不把 `bracket_slots` 暴露为新的管理 API。
- 不把轮空写入 Ranking Engine 输入。

## 实现记录

- 更新 `lib/server/repositories/supabase.ts`：
  - 生成签表前检查已有 `bracket_slots`。
  - 单败淘汰生成时写入首轮 `bracket_slots`。
  - 使用 `occupied` 表示真实选手位，使用 `bye` 表示轮空位。
- 更新 `lib/server/mock-repository.ts` 和 `lib/server/repositories/mock.ts`：
  - 新增 Mock 内存 slot 数据。
  - Mock 初始签表生成同步写入 slots。
- 更新 `lib/domain/types.ts`，新增 `BracketSlotSummary`。
- 新增 `scripts/verify_supabase_bracket_slots_generation.mjs`。
- 更新 `package.json`，新增 `npm run bracket:slots:verify`。

## 验证记录

- `node --check scripts/verify_supabase_bracket_slots_generation.mjs`：通过，脚本语法无错误。
- `npm run bracket:slots:verify`：通过，真库验证 viewer 拒绝、editor 生成、3 个首轮 slots、1 个 bye、1 场真实 match。
- `npm run check`：通过，TypeScript 类型检查无错误。
- `npm run db:verify`：通过，数据库约束验收仍通过。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，Mock 模式完整本地验收通过。
- `git diff --check`：通过，当前变更无空白格式问题。

## 边界与后续

- 当前阶段只保证初始签表生成写入 slots；页面仍从 `matches` 和参赛名单推导展示。
- 后续可将晋级落位写入 `bracket_slots`，再让管理端签表视图从 slot 模型读取。
