# 阶段 53：晋级落位写入 bracket_slots

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 53 执行记录，新增晋级落位写入 bracket_slots |

## 目标

阶段 53 的目标是让单败淘汰晋级生成下一轮时同步写入 `bracket_slots`。

阶段 52 已让初始签表写入首轮 slots，但晋级仍只写 `matches`。从业务本质看，下一轮签位应该能回答“这个位置来自哪场比赛胜者，还是来自之前的轮空选手”。因此本阶段把晋级来源写入 slot，而不是只依赖 matches 反推。

## 范围

- Supabase Repository 晋级生成下一轮时同步写入 `bracket_slots`。
- Mock Repository 晋级生成下一轮时同步写入内存 slots。
- 真实比赛胜者进入下一轮时写 `advanced` slot，并保存 `source_match_id`。
- pending bye 进入下一轮并参与对阵时写 `occupied` slot，不保存 `source_match_id`。
- 奇数晋级候选继续轮空时写 `bye` slot。
- 已有下一轮 `matches` 或下一轮 `bracket_slots` 时拒绝重复晋级。
- 新增 Supabase 真库晋级验收脚本，覆盖 viewer 拒绝、editor 晋级、下一轮 slots 和真实 match。

## 非目标

- 不改签表页面读取逻辑。
- 不新增 `bracket_slots` 查询 API。
- 不改 Ranking Engine 输入。
- 不改变真实比赛表的含义。

## 实现记录

- 更新 `lib/server/repositories/supabase.ts`：
  - 晋级前检查下一轮 slots 是否已存在。
  - 生成下一轮 matches 前同步写入下一轮 `bracket_slots`。
  - 将真实胜者 slot 标记为 `advanced` 并记录 `source_match_id`。
  - 将 pending bye 参与下一轮对阵时标记为 `occupied`。
- 更新 `lib/server/repositories/mock.ts`：
  - Mock 晋级路径同步写入下一轮内存 slots。
- 新增 `scripts/verify_supabase_bracket_slots_advancement.mjs`。
- 更新 `package.json`，新增 `npm run bracket:slots:advance:verify`。

## 验证记录

- `node --check scripts/verify_supabase_bracket_slots_advancement.mjs`：通过，脚本语法无错误。
- `npm run bracket:slots:advance:verify`：通过，真库验证 editor 初始生成、首轮完赛、viewer 晋级拒绝、editor 晋级和下一轮 slots。
- `npm run check`：通过，TypeScript 类型检查无错误。
- `npm run db:verify`：通过，数据库约束验收仍通过。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，Mock 模式完整本地验收通过。
- `git diff --check`：通过，当前变更无空白格式问题。

## 边界与后续

- 当前阶段只保证初始生成和晋级都会写入 slots；页面仍从 `matches` 和参赛名单推导展示。
- 后续可让管理端签表视图优先从 `bracket_slots` 读取固定签位、轮空和晋级来源。
