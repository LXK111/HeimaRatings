# 阶段 3：后端 API 与 Ranking Engine 封装

## 范围

- 使用 Next.js Route Handlers 创建 MVP API。
- 创建服务端 Mock Repository，后续可替换为 Supabase Repository。
- 创建 Ranking Engine TypeScript 适配层。
- 创建 Python runner，复用当前目录下已有的 Elo、SDR、Glicko-2、融合算法。

## API 清单

| API | 方法 | 说明 |
|-----|------|------|
| `/api/weapons` | `GET` | 查询武器类型 |
| `/api/players` | `GET` | 查询选手列表 |
| `/api/tournaments` | `GET` | 查询赛事列表 |
| `/api/tournaments/[id]` | `GET` | 查询赛事详情 |
| `/api/tournaments/[id]/events` | `GET` | 查询赛事项目 |
| `/api/tournaments/[id]/matches` | `GET` | 查询比赛记录 |
| `/api/tournaments/[id]/matches` | `POST` | 创建比赛草稿，当前不持久化 |
| `/api/rankings/calculate` | `POST` | 调用 Ranking Engine 计算排名 |
| `/api/rankings/[snapshotId]` | `GET` | 查询排名快照 |
| `/api/public/rankings/[pageId]` | `GET` | 查询公开榜单 |

## Ranking Engine 输入

```json
{
  "algorithm": "hybrid",
  "tournamentId": "tournament-001",
  "weaponTypeId": "weapon-longsword",
  "players": [
    { "id": "player-001", "name": "林澈", "rating": 1812, "rd": 220, "sigma": 0.2 }
  ],
  "matches": [
    [
      { "id": "match-001", "round": 1, "player1": "林澈", "player2": "周衡", "score1": 9, "score2": 6 }
    ]
  ]
}
```

## Ranking Engine 输出

```json
{
  "algorithm": "hybrid",
  "generatedAt": "2026-06-24T00:00:00.000Z",
  "rankings": [
    {
      "playerId": "player-001",
      "name": "林澈",
      "rank": 1,
      "rating": 1812,
      "matches": 2,
      "wins": 2,
      "losses": 0,
      "draws": 0
    }
  ]
}
```

## 当前实现策略

- `lib/server/mock-repository.ts`：从阶段 2 Mock 数据读取信息，并组装排名计算输入。
- `lib/ranking-engine/adapter.ts`：服务端使用 `child_process.spawn` 调用 Python runner。
- `scripts/ranking_engine_runner.py`：通过 `importlib` 动态加载现有 Python 算法类。
- `/api/rankings/calculate`：如果请求体包含完整 Ranking Engine 输入，则使用请求体；否则使用 Mock 数据组装默认输入。

## 当前限制

- API 数据暂不持久化。
- `POST /api/tournaments/[id]/matches` 只返回草稿对象，不写入数据库。
- Ranking Engine 依赖本机 `python3`。
- Python 算法当前以选手姓名作为对阵输入，TypeScript 适配层负责将返回结果映射回 `playerId`。

## 后续衔接

- 阶段 4 将把比赛录入页面与 API 连接，形成比赛录入与排名计算闭环。
- 后续 Supabase Repository 可替换 Mock Repository，API 路由不需要大改。
