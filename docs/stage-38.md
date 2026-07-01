# 阶段 38：签表/项目排名真库验收脚本

## 修改历史

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v0.1 | 2026-07-01 | Codex | 创建阶段 38 执行记录，新增签表和项目排名真库验收 |

## 范围

- 为签表、比赛结果和项目级排名快照补充真库数据库约束验收。
- 验证 `matches` 写入时赛事、项目、武器和选手必须属于同一组织。
- 验证带 `event_id` 的 `ranking_snapshots` 不能跨组织绑定比赛项目。
- 验证 `ranking_snapshot_items` 不能向快照挂载其他组织选手。
- 扩展管理端 Auth/API 验收，覆盖项目参赛名单读取、viewer 签表生成拒绝和 editor 项目级快照写入。

## 非目标

- 不新增业务模型。
- 不修改签表生成、晋级和排名计算规则。
- 不新增公开页项目榜。
- 不引入浏览器自动化验收。

## 实现记录

- 新增 `database/validations/202607010001_verify_bracket_ranking_integrity.sql`：
  - 检查 `matches`、`ranking_snapshots`、`ranking_snapshot_items` 的组织一致性 trigger 和 RLS policy 是否存在。
  - 在事务内创建两个验证组织及其武器、选手、赛事和项目。
  - 插入合法 `matches` 和项目级 `ranking_snapshots` 数据。
  - 验证跨组织 match、跨组织 event ranking snapshot 和跨组织 snapshot item 会失败。
- 更新 `scripts/verify_management_auth_api_e2e.mjs`：
  - 增加项目参赛名单 API 读取验收。
  - 增加 viewer 调用签表生成接口被拒绝的验收。
  - 增加 editor 保存项目级排名快照的验收。
  - 支持通过 `HEIMA_RATINGS_API_VERIFY_TOURNAMENT_ID`、`HEIMA_RATINGS_API_VERIFY_EVENT_ID`、`HEIMA_RATINGS_API_VERIFY_WEAPON_TYPE_ID` 覆盖默认验收目标。

## 当前限制

- 真库数据库验收依赖已应用到阶段 31 之后的迁移，否则缺少项目参赛名单、项目级快照或 RLS 对象时会失败。
- 管理端 API Cookie 验收需要先启动本地服务，并准备 viewer/editor 测试账号和对应组织成员关系。
- 本阶段只做脚本化验收，不覆盖真实浏览器点击流。

## 验收方式

```bash
# 数据库约束验收，需要 psql 可连接真库
npm run db:verify

# 管理端 API Cookie 验收，需要先启动本地服务
npm run auth:api:verify
```

## 验证记录

- `node --check scripts/verify_management_auth_api_e2e.mjs`：通过，脚本语法无错误。
- `git diff --check`：通过，无空白格式问题。
- `npm run check`：通过，TypeScript 无错误。
- `HEIMA_RATINGS_DATA_SOURCE=mock npm run verify`：通过，已自动执行 `check`、`build`，临时启动生产服务并完成 smoke。
- `npm run db:verify`：通过，已在真库连接上执行全部数据库约束验收。
- `HEIMA_RATINGS_API_VERIFY_BASE_URL=http://localhost:3001 npm run auth:api:verify`：通过，已验证匿名公开访问、管理端登录保护、viewer 只读、viewer 签表写入拒绝、editor 基础写入和 editor 项目级排名快照写入。
