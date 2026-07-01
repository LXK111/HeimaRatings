# 阶段 49：Ranking Engine 输入构造回归测试

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 49 执行记录，新增 API/Repository 级 Ranking Engine 输入构造回归 |

## 目标

阶段 49 的目标是验证 API/Repository 从业务数据构造 Ranking Engine 输入时，只包含真实比赛，不把轮空状态转换成虚拟比赛。

阶段 48 已验证直接喂给 Ranking Engine 的输入可以正确排除轮空。阶段 49 补齐上一层边界：业务数据经过 Repository 和 `/api/rankings/calculate` 后，输出的场次统计仍应只反映真实 matches。

## 范围

- 新增 `npm run ranking:input:verify`。
- 以 Mock 模式启动临时生产服务。
- 读取 `/api/tournaments/demo/matches`，确认长剑公开组只有真实对阵。
- 调用 `/api/rankings/calculate`，验证长剑公开组中首轮轮空选手不会获得虚拟比赛。
- 验证军刀公开组的项目/武器过滤不会串入其他武器或无该武器积分的选手。

## 非目标

- 不新增数据库迁移。
- 不访问 Supabase 真库。
- 不修改 Ranking Engine 算法。
- 不固定 rating 精确值。

## 实现记录

- 新增 `scripts/verify_ranking_input_construction.mjs`：
  - 构建生产包并以 Mock 模式启动临时服务。
  - 使用真实 API 验证 Repository 构造路径。
  - 断言长剑公开组真实比赛数与 Ranking Engine 输出场次一致。
  - 断言首轮轮空选手没有被算入虚拟首轮比赛。
  - 断言军刀公开组只包含军刀项目相关选手和场次。
- 更新 `package.json`，新增 `ranking:input:verify` 命令。

## 验证记录

- `node --check scripts/verify_ranking_input_construction.mjs`：通过，脚本语法无错误。
- `npm run ranking:input:verify`：通过，API/Repository 输入构造回归通过。
- `npm run ranking:verify`：通过，Ranking Engine 直接输入回归仍通过。
- `npm run check`：通过，TypeScript 类型检查无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，Mock 模式完整本地验收通过。
- `git diff --check`：通过，当前变更无空白格式问题。

## 边界与后续

- 当前脚本覆盖 Mock API/Repository 路径；Supabase 真库输入构造可在后续通过临时赛事和比赛数据做端到端回归。
- 后续可继续推进完整 `bracket_slots` 模型，提升签位审计能力。
