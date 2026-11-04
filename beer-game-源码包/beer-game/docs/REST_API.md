# REST API 表

| 方法 | 路径 | 说明 | 鉴权 |
| ---- | ---- | ---- | ---- |
| GET | `/health` | 健康检查 | - |
| POST | `/api/rooms` | 创建房间 | - |
| GET | `/api/rooms/:code` | 查询房间是否存在 | - |
| GET | `/api/rooms/:code/settings` | 获取房间默认/已配置参数 | - |
| POST | `/api/rooms/:code/join` | 玩家加入（返回 session token） | - |
| GET | `/api/rooms/:code/review` | 获取复盘（全局数据，GameStatus=ended 才可） | 需 roomId 查询 |
| GET | `/api/rooms/:code/review.csv` | 导出 CSV 复盘 | - |
| GET | `/api/rooms/:code/review.json` | 导出 JSON 复盘 | - |
| POST | `/api/teacher/:roomId/token` | 讲师凭 token 校验/刷新 | teacherToken |
| GET | `/api/scenarios` | 需求场景列表 | - |

> 玩家接口绝不返回未来需求与全局库存；讲师操作全部校验 teacherToken（仅创建者 HTTP 侧回传，实时操作走 Socket 鉴权）。