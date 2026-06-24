# 阶段 2：Web UI 基础框架与页面

## 设计方向

本阶段使用 `frontend-design` 技能推进 UI 设计，视觉方向为“HEMA 赛场裁判台 + 金属武器库”：

- 深铁蓝背景承载管理台氛围。
- 铜金色强调武器、排名和关键操作。
- 高密度表格承载赛事、比赛和排名数据。
- 卡片和徽标展示武器类型、算法状态和比赛状态。

## 范围

- 建立统一管理端外壳与导航。
- 创建通用面板、表格和操作链接组件。
- 扩展 Mock 数据，覆盖比赛项目、比赛记录和分武器排名。
- 创建阶段 2 页面路由骨架。

## 页面清单

- `/`：控制台。
- `/weapons`：武器类型管理。
- `/players`：选手管理。
- `/tournaments`：赛事管理。
- `/tournaments/[id]`：赛事详情。
- `/tournaments/[id]/events`：比赛项目管理。
- `/tournaments/[id]/matches`：比赛录入。
- `/tournaments/[id]/rankings`：分武器排名榜。
- `/public/rankings/[pageId]`：公开榜单。
- `/embed/rankings/[pageId]`：iframe 嵌入榜单。

## 暂不包含

- 暂不接入 Supabase。
- 暂不实现表单提交。
- 暂不调用 Ranking Engine。
- 暂不实现真实路由参数查询。

## 后续衔接

- 阶段 3：后端 API 与 Ranking Engine 封装。
- 阶段 4：比赛录入与排名计算闭环。
