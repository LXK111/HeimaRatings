# 阶段 48：Ranking Engine 输入输出回归测试

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 48 执行记录，新增 Ranking Engine 输入输出回归测试 |

## 目标

阶段 48 的目标是为 Ranking Engine 增加独立回归测试，尤其验证轮空不会进入比赛输入。

从排名计算的本质看，Ranking Engine 只能消费真实发生的比赛。轮空是签表状态，不是比赛结果；如果轮空被编码成虚拟比赛、自动胜或 0:0，项目排名会被污染。

## 范围

- 新增独立命令 `npm run ranking:verify`。
- 使用固定 4 人 2 轮真实比赛输入验证排名输出结构。
- 验证同一输入多次运行时核心输出签名稳定。
- 使用 5 人场景验证轮空选手不出现在输入 matches 中。
- 验证轮空选手不会获得虚拟 matches、wins 或 losses。

## 非目标

- 不修改 Ranking Engine 算法。
- 不启动 Next.js 服务。
- 不依赖 Supabase。
- 不断言具体 rating 精确值，避免和算法内部细节强耦合。

## 实现记录

- 新增 `scripts/verify_ranking_engine_regression.mjs`：
  - 通过 `python3 scripts/ranking_engine_runner.py` 调用现有 Ranking Engine。
  - 固定输入验证排名行数、胜负场次和 rating 数值类型。
  - 通过稳定签名验证同一输入的核心输出一致。
  - 构造 5 人轮空场景，断言轮空选手不进入比赛输入，也不会产生虚拟赛果。
- 更新 `package.json`，新增 `ranking:verify` 命令。

## 验证记录

- `node --check scripts/verify_ranking_engine_regression.mjs`：通过，脚本语法无错误。
- `npm run ranking:verify`：通过，固定输入输出和轮空排除回归通过。

## 边界与后续

- 当前回归测试验证结构、胜负场次和输入边界，不固定算法 rating 的精确数值。
- 后续可增加 API 级 Ranking Engine 输入构造回归，覆盖 Repository 从 matches 构造输入时同样不会包含轮空。
