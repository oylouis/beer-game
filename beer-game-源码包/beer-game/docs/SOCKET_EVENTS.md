# Socket.io 事件表

## 客户端 → 服务端（emit）
| 事件 | 负载 | 说明 |
| ---- | ---- | ---- |
| `teacher:createRoom` | `{ name }` | 讲师创建房间，回 `teacher:roomCreated` |
| `player:join` | `{ code, name }` | 玩家加入房间，回 `player:joined` |
| `teacher:selectRole` | `{ roomId, role, selectedBy }` | 讲师选择/分配角色 |
| `teacher:addAI` | `{ roomId, role }` | AI 补位 |
| `teacher:kickPlayer` | `{ roomId, role }` | 讲师踢人 |
| `teacher:removeAI` | `{ roomId, role }` | 移除 AI |
| `teacher:start` | `{ roomId }` | 开始（重放开亦可） |
| `teacher:pause` | `{ roomId }` | 暂停 |
| `teacher:resume` | `{ roomId }` | 继续 |
| `teacher:step` | `{ roomId }` | 单步推进一周 |
| `teacher:reset` | `{ roomId }` | 重置/重开 |
| `teacher:selectScenario` | `{ roomId, scenarioId }` | 切换需求场景 |
| `player:placeOrder` | `{ roomId, order }` | 玩家下单（服务端校验） |
| `player:reconnect` | `{ token }` | 用 session token 断线重连 |
| `room:getState` | `{ roomId }` | 请求自身可见状态 |

## 服务端 → 客户端（on）
| 事件 | 负载 | 说明 |
| ---- | ---- | ---- |
| `teacher:roomCreated` | `{ roomId, code, teacherToken }` | 创建成功 |
| `player:joined` | `{ room, player }` | 加入成功 |
| `room:update` | `RoomPublic` | 房间通用状态广播 |
| `player:state` | `PlayerView` | 玩家自身可见状态 |
| `teacher:global` | `GlobalView` | 讲师全局数据 |
| `week:advanced` | `{ week, gameOver }` | 周推进 |
| `player:kicked` | `{}` | 被踢 |
| `teacher:error` / `player:error` | `{ message }` | 错误 |
| `game:over` | `{ roomId }` | 游戏结束，进入复盘 |

> 安全：所有订单、角色权限、踢人/补 AI 均由服务端校验；玩家接口不返回未来需求与全局库存。