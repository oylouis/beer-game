# 数据模型（Prisma / PostgreSQL）

## 说明
服务端为权威状态机；房间、玩家、每周快照、设置、结果持久化到 PostgreSQL，刷新/断线不丢状态。

## 表

### Room
- `id` String @id @default(uuid())
- `code` String @unique 房间码
- `status` GameStatus  (`idle`/`playing`/`paused`/`ended`)
- `currentWeek` Int
- `totalWeeks` Int
- `scenarioId` String
- `createdAt`, `updatedAt`
- `teacherToken` String 讲师令牌(哈希)
- `teacherSession` String? 讲师当前 session
- 玩家关联：`players Player[]`
- 周快照：`weeklySnapshots WeeklySnapshot[]`

### Player
- `id` String @id
- `roomId` String
- `role` Role (`RETAILER`/`WHOLESALER`/`DISTRIBUTOR`/`FACTORY`)
- `name` String
- `sessionToken` String? 断线重连 token
- `isAI` Boolean
- `aiStrategy` String?
- `connected` Boolean
- `totalCost` Float 累计成本
- 周快照 per role：`playerSnapshots PlayerSnapshot[]`

### Settings（房间配置快照）
- `id` String @id
- `roomId` String @unique
- 各延迟/成本/初始库存/初始在途字段

### WeeklySnapshot（全局每周状态，复盘用）
- `id`, `roomId`, `week` Int
- per-role 汇总 JSON（订单量、库存、缺货、成本）

### PlayerSnapshot（每个玩家每周明细）
- `id`, `roomId`, `playerId`, `week` Int
- `orderReceived` 收到下游订单
- `orderPlaced` 本角色下单
- `inventory` 期末库存
- `backlog` 缺货
- `incoming` 在途
- `inventoryCost`, `backlogCost`, `weekCost`, `cumulativeCost`

### Result（复盘结果）
- `id`, `roomId` @unique
- `varianceMultiplier` Float 牛鞭效应放大倍数
- `totalCosts` JSON 各角色累计成本
- `report` JSON 复盘报告

## 备注
- 快照按 `(roomId, week)` 及 `(roomId, playerId, week)` 唯一。
- 重开(restart)：删除该房间 PlayerSnapshot/WeeklySnapshot/Result，重置 Room 状态，复用房间码。