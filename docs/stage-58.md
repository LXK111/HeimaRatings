# 阶段 58：真实数据导入/初始化工具

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 58 执行记录，新增 CSV 数据导入工具和真库验收 |

## 目标

阶段 58 的目标是让部署前真实基础数据可以被可控、可审计、可重复地写入 Supabase 真库。

从第一性原理看，部署前最紧急的问题不是“在哪里点上传”，而是“真实数据能否按组织边界、武器、项目和参赛名单关系正确入库”。因此本阶段先提供命令行导入工具和真库 apply 验收，不做管理端上传 UI。

## 范围

- 新增 `npm run data:import`。
- 支持从 CSV 目录读取：
  - `players.csv`：选手姓名和俱乐部。
  - `ratings.csv`：选手按武器的初始/当前积分和统计字段。
  - `event_entries.csv`：比赛项目参赛名单、seed 和状态。
- 默认 dry-run，只校验和输出计划；显式传入 `--apply` 才写入真库。
- 按组织 slug 定位导入范围。
- 按组织内选手 `name` 识别选手，符合数据库唯一约束 `(organization_id, name)`。
- 武器必须通过 `weapon_slug` 匹配已存在且启用的武器，不自动创建未知武器。
- 参赛名单支持通过 `event_id` 或 `tournament_name + event_name` 定位项目。
- 新增 `npm run data:import:verify`，创建临时组织、执行真实 apply 导入、核对写入并清理。

## 非目标

- 不新增管理端文件上传 UI。
- 不支持 Excel `.xlsx` 解析。
- 不自动创建未知武器。
- 不改变数据库 schema、RLS policy 或唯一约束。

## 实现记录

- 新增 `scripts/import_seed_data.mjs`，实现 CSV 解析、dry-run 计划、`--apply` 写入和参数解析。
- 新增 `scripts/verify_data_import.mjs`，验证临时组织下的真实 apply 导入闭环。
- 更新 `package.json`，新增 `data:import` 和 `data:import:verify` 命令。
- 新增 `docs/examples/import/players.csv`、`docs/examples/import/ratings.csv`、`docs/examples/import/event_entries.csv`。
- 更新 `README.md` 当前阶段、已完成阶段、阶段边界和后续阶段。
- 更新 `docs/HEMA排名网站代码生成记录与方案变化.md`，记录阶段 58。

## 使用方式

dry-run：

```bash
npm run data:import -- --dir docs/examples/import --organization-slug hema-ratings-demo
```

真实写入：

```bash
npm run data:import -- --dir data/import --organization-slug hema-ratings-demo --apply
```

## 验证记录

- `node --check scripts/import_seed_data.mjs`：通过，导入脚本语法无错误。
- `node --check scripts/verify_data_import.mjs`：通过，验收脚本语法无错误。
- `npm run data:import -- --dir docs/examples/import --organization-slug hema-ratings-demo`：通过，示例 CSV dry-run 不写库。
- `npm run data:import:verify`：通过，临时组织真实 apply 导入、核对和清理通过。
- `npm run check`：通过，TypeScript 类型检查无错误。
- `git diff --check`：通过，当前变更无空白格式问题。

## 边界与后续

- 当前阶段导入工具面向部署/运维使用，不面向普通管理端用户。
- CSV 文件需要由用户自行准备；真实数据目录 `data/import` 不纳入版本库要求。
- 下一步建议推进阶段 59：公开页和嵌入页生产化细节。
