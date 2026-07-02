# 比赛结果导入模板说明

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-02 | Codex | 创建比赛结果导入模板说明，补充字段含义、使用方式和校验规则 |

## 适用场景

本目录提供从外部 CSV 或 Excel 导入比赛结果并更新长期积分的模板。

导入工具会读取赛事、比赛项目、报名名单和比赛结果，写入 `matches`，随后调用 TypeScript Ranking Engine 重新计算受影响武器的长期积分，并更新 `player_weapon_ratings`。

## 文件清单

| 文件 | 用途 | 是否必需 |
|------|------|----------|
| `players.csv` | 导入或补充选手基础信息 | 可选 |
| `event_entries.csv` | 导入比赛项目报名名单 | 比赛结果中的选手尚未报名时必需 |
| `matches.csv` | 导入比赛结果 | 必需 |
| `matches_import_template.xlsx` | Excel 合并模板，包含 `players`、`event_entries`、`matches` 三个 sheet | 可选，使用 Excel 导入时使用 |

## Excel Sheet 要求

使用 `.xlsx` 导入时，sheet 名称必须为：

| Sheet 名称 | 对应 CSV | 用途 |
|------------|----------|------|
| `players` | `players.csv` | 选手基础信息 |
| `event_entries` | `event_entries.csv` | 项目报名名单 |
| `matches` | `matches.csv` | 比赛结果 |

sheet 名称需要完全匹配。导入工具会忽略不存在的可选 sheet。

## players 字段说明

| 字段 | 示例 | 必填 | 含义 | 规则 |
|------|------|------|------|------|
| `name` | 张三 | 是 | 选手名称 | 同一组织内必须唯一；比赛结果和报名名单会通过该名称匹配选手 |
| `club` | 黑马剑术馆 | 否 | 选手所属俱乐部 | 可为空；选手已存在时可用于更新俱乐部 |

## event_entries 字段说明

| 字段 | 示例 | 必填 | 含义 | 规则 |
|------|------|------|------|------|
| `tournament_name` | 2026 夏季积分赛 | 使用名称定位项目时必填 | 赛事名称 | 必须匹配当前组织中已存在的赛事 |
| `event_name` | 长剑公开组 | 使用名称定位项目时必填 | 比赛项目名称 | 必须匹配对应赛事下已存在的比赛项目 |
| `event_id` | uuid | 否 | 比赛项目 ID | 如提供 `event_id`，可不填 `tournament_name` 和 `event_name` |
| `player_name` | 张三 | 是 | 报名选手名称 | 必须能匹配当前组织中已存在或本次 `players` 中新增的选手 |
| `seed` | 1 | 否 | 种子序号 | 正整数；可为空 |
| `status` | registered | 否 | 报名状态 | 支持 `registered` 或 `withdrawn`；为空时默认 `registered` |

## matches 字段说明

| 字段 | 示例 | 必填 | 含义 | 规则 |
|------|------|------|------|------|
| `赛事` | 2026 夏季积分赛 | 是 | 赛事名称 | 必须匹配当前组织中已存在的赛事 |
| `比赛项目` | 长剑公开组 | 是 | 比赛项目名称 | 必须属于该赛事 |
| `轮次` | 1 | 是 | 比赛轮次 | 正整数 |
| `选手 A` | 张三 | 是 | 第一名选手 | 必须已报名该比赛项目，且状态为 `registered` |
| `选手 B` | 李四 | 是 | 第二名选手 | 必须已报名该比赛项目，且状态为 `registered`；不能与选手 A 相同 |
| `比分 A` | 5 | 是 | 选手 A 得分 | 非负整数 |
| `比分 B` | 3 | 是 | 选手 B 得分 | 非负整数 |

`matches` 也支持英文别名字段：

| 中文字段 | 英文字段 |
|----------|----------|
| `赛事` | `tournament_name` |
| `比赛项目` | `event_name` |
| `轮次` | `round` |
| `选手 A` | `player1_name` |
| `选手 B` | `player2_name` |
| `比分 A` | `score1` |
| `比分 B` | `score2` |

## 使用步骤

1. 先在系统中创建赛事。
2. 在赛事详情页创建比赛项目，并绑定正确武器类型。
3. 准备 `players.csv`，或确认选手已经存在。
4. 准备 `event_entries.csv`，或确认所有参赛选手已经报名该项目。
5. 准备 `matches.csv` 或填写 `matches_import_template.xlsx` 中的 `matches` sheet。
6. 先执行 dry-run，确认计划无误。
7. 再加 `--apply` 写入真库。

## CSV 导入命令

dry-run：

```bash
npm run data:import -- --dir docs/examples/import/templates --organization-slug <organization-slug>
```

真实写入：

```bash
npm run data:import -- --dir docs/examples/import/templates --organization-slug <organization-slug> --apply
```

## Excel 导入命令

dry-run：

```bash
npm run data:import -- --file docs/examples/import/templates/matches_import_template.xlsx --organization-slug <organization-slug>
```

真实写入：

```bash
npm run data:import -- --file docs/examples/import/templates/matches_import_template.xlsx --organization-slug <organization-slug> --apply
```

## 导入后的系统行为

- `players`：按当前组织内 `name` 匹配，存在则可更新俱乐部，不存在则创建。
- `event_entries`：按比赛项目和选手 upsert 报名记录。
- `matches`：写入比赛结果。
- 长期积分：导入比赛后，系统会按受影响武器重新计算组织长期积分，并更新 `player_weapon_ratings`。
- 公开榜单：长期积分更新后，仍需要在系统中执行公开榜单发布，公开页才会展示最新快照。

## 常见错误

| 错误场景 | 原因 | 处理方式 |
|----------|------|----------|
| `event not found` | 赛事或比赛项目名称不匹配 | 检查 `赛事`、`比赛项目` 是否和系统中完全一致 |
| `player not found` | 比赛结果或报名名单中的选手不存在 | 先在 `players.csv` 中补充选手，或在系统中创建选手 |
| `player must be registered for event` | 选手未报名该比赛项目 | 在 `event_entries.csv` 中补充报名记录，或在系统页面报名 |
| `player is withdrawn from event` | 选手报名状态为退赛 | 将状态改为 `registered` 后再导入比赛 |
| `duplicated match in import file` | 同一项目、同一轮次、同一组选手重复出现 | 删除重复比赛记录 |
| `match already exists with different result` | 数据库已有同场比赛但比分不同 | 先确认是否需要在系统中修改已有比赛，而不是重复导入 |

## 注意事项

- 真实导入前建议始终先 dry-run。
- 模板中的示例选手、赛事和项目名称需要替换成真实数据。
- `matches` 中的赛事和比赛项目不会自动创建，必须先在系统中存在。
- 导入工具面向部署或运维使用，不是普通管理端上传 UI。
