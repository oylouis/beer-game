# 啤酒游戏：牛鞭效应云端模拟

> 基于经典啤酒游戏教学机制的非官方复刻（与 MIT 无官方关联，不使用 MIT 商标/Logo）。

一个可部署到云端的多人供应链仿真 Web 应用。模拟一条「零售商 ← 批发商 ← 分销商 ← 工厂」的啤酒供应链，通过订单逐级放大现象演示**牛鞭效应**。

- 前端：React 18 + TypeScript + Vite + Tailwind CSS + Recharts + PWA（vite-plugin-pwa）
- 后端：Node 20 + Express + Socket.io + TypeScript（服务端权威状态机）
- 数据库：PostgreSQL + Prisma（支持 Neon / Supabase）
- 支持：单人模式（AI 代理）、多人课堂模式（讲师开房 + 4 人分工）、断线重连、移动端优先响应式

---

## 功能总览

| 模块 | 能力 |
| ---- | ---- |
| 首页 | 创建房间 / 加入房间 / 单人练习 / 规则说明 |
| 讲师端 | 房间码、角色分配、AI 补位、开始/暂停/单步/重置、需求场景、全局数据、复盘、CSV/JSON 导出 |
| 玩家端 | 移动端优先，显示当前周/角色/库存/在途/收单/发货/缺货/成本，大触控数字键盘下单 |
| 单人模式 | 选 1 角色，其余 3 角色用合法 AI 策略（order-up-to / 锚定），不读取未来需求 |
| 多人模式 | 房间码加入，角色唯一绑定，session token 断线重连，掉线可 AI 接管，讲师可踢人/补 AI |
| 图表 | 订单量、库存、缺货、累计成本；复盘显示牛鞭效应方差放大倍数 |
| 持久化 | 房间、玩家、每周快照、设置、结果存 PostgreSQL；刷新不丢状态 |
| 安全 | 服务端校验所有订单与角色权限；玩家接口不返回未来需求与全局库存；讲师令牌保护 |

---

## 目录结构

详见 [`docs/DIRECTORY.md`](docs/DIRECTORY.md)。

## 规则与延迟模型

详见 [`docs/RULES.md`](docs/RULES.md)。核心：
- 每周期固定流程：接收到货 → 满足订单/需求 → 记录缺货 → 计算成本 → 下单 → 推进延迟队列
- 订单处理延迟 1 周、发货/运输延迟 2 周、工厂生产延迟 2 周
- 库存成本 0.5 元/箱/周，缺货成本 1.0 元/箱/周
- 信息隔离：玩家只看得到自己角色数据

---

## 本地运行

### 方式一：手动（推荐开发）

前置：Node 20+、PostgreSQL 16（或 Docker 起库）。

```bash
# 1. 安装依赖（根目录，workspace 安装）
npm install

# 2. 准备数据库
#    a) 用 docker 起一个开发库：
docker run -d --name beergame-pg -e POSTGRES_USER=beer -e POSTGRES_PASSWORD=beer \
  -e POSTGRES_DB=beergame -p 5432:5432 postgres:16-alpine

#    b) 配置连接串
cp .env.example .env
#    编辑 .env 的 DATABASE_URL=postgresql://beer:beer@localhost:5432/beergame?schema=public

# 3. 构建 shared 包 + 生成 prisma client + 数据库迁移
npm run build --workspace @beer-game/shared
cd apps/server && npx prisma generate && npx prisma migrate dev --name init && cd ../..

# 4. 启动
npm run dev            # 后端 :4000   （另开终端）
npm run dev:web        # 前端 :5173
# 打开 http://localhost:5173
```

> 开发期前端已配置 `/api` 与 `/socket.io` 代理到 :4000，无需额外 CORS 配置。

### 方式二：Docker 一键

```bash
cp .env.example .env
docker compose up -d --build
# 前端 http://localhost:5173  后端 http://localhost:4000
```

数据库迁移在 server 启动时自动执行（`prisma migrate deploy`）。

---

## 环境变量（`.env`）

| 变量 | 说明 | 默认 |
| ---- | ---- | ---- |
| `PORT` | 后端端口 | 4000 |
| `DATABASE_URL` | PostgreSQL 连接串（Prisma 格式） | 必填 |
| `CLIENT_URL` | 前端地址 | http://localhost:5173 |
| `CORS_ORIGIN` | 允许的 CORS 源（逗号分隔） | http://localhost:5173 |
| `VITE_API_BASE` | 前端调后端的 base（生产设为后端公网地址） | 同源留空 |
| `VITE_SOCKET_URL` | 前端 Socket.io 地址（生产设为后端公网地址） | 同源 |
| `ROOM_CODE_LENGTH` | 房间码长度 | 6 |

---

## 数据库迁移命令

```bash
# 本地开发（建新迁移）
cd apps/server && npx prisma migrate dev --name <name>

# 生产（应用已提交的迁移）
cd apps/server && npx prisma migrate deploy

# 或直接同步 schema（原型期）
cd apps/server && npx prisma db push
```

---

## 云端部署方案（完整）

### 总览
| 组件 | 推荐平台 | 类型 |
| ---- | ------ | ---- |
| 前端 | Vercel / Netlify | 静态托管 |
| 后端 | Render / Railway / Fly.io | Node 服务 |
| 数据库 | Neon / Supabase | PostgreSQL |

### 步骤 1：数据库（Neon 为例）
1. 注册 Neon → 新建项目。
2. 复制 Connection String（含 password）为 `DATABASE_URL`。
3. 记下该 URL，后续配到后端环境变量。

### 步骤 2：后端（Render 为例）
1. 把仓库推送到 GitHub。
2. Render → New → Web Service，选择该仓库。
3. 设置：
   - **Root Directory**：`apps/server`
   - **Build Command**：`npm install && npm run build --workspace @beer-game/shared && cd apps/server && npx prisma generate && npx tsc -p tsconfig.json`（若 Root 已到 apps/server 则相应调整）
   - **Start Command**：`node dist/index.js`
   - **环境变量**：`DATABASE_URL`、`NODE_ENV=production`、`CORS_ORIGIN=<前端地址>`、`VITE_*`（如需要）
   - 启动命令中执行迁移：改为 `npx prisma migrate deploy && node dist/index.js`
4. Deploy 后得到后端 URL，如 `https://beer-server.onrender.com`。

### 步骤 3：前端（Vercel 为例）
1. Vercel → Import → 选该仓库。
2. Framework Preset：`Vite`。
3. Root Directory：`apps/web`。
4. 环境变量：
   - `VITE_API_BASE=https://beer-server.onrender.com`
   - `VITE_SOCKET_URL=https://beer-server.onrender.com`
5. Deploy 后得到前端 URL，如 `https://beer-game.vercel.app`。

### CORS / WebSocket 配置
- 后端需把前端域名加入 `CORS_ORIGIN`（例如 `https://beer-game.vercel.app`）。
- Render/Railway 支持 WebSocket；若用 Fly.io，确保网络端口对 WS 开放。
- 前端 `VITE_SOCKET_URL` 指向后端，Socket.io 使用 `websocket` 与 `polling` 双传输。

### Fly.io（备选后端）
```bash
fly launch --from ./apps/server
fly secrets set DATABASE_URL="postgresql://..."
fly deploy
```

---

## 测试

```bash
npm test        # 服务端规则引擎单元测试（vitest）
npm run typecheck   # 全工程类型检查
```

详细测试清单见 [`docs/TESTING.md`](docs/TESTING.md)。

---

## 自测用例

见 [`docs/TESTING.md`](docs/TESTING.md) 的「自测用例」一节（含 5 个用例与预期）。

## 测试房间 / 流程

1. 打开首页 → 讲师开房 → 得到房间码。
2. 用 4 个浏览器（或手机）分别加入房间 → 各占一角色。
3. 讲师选需求场景 → 开始 → 每周期各角色下单（讲师可单步/暂停/重置）。
4. 全程讲师可看全局，玩家只见自身。
5. 36 周结束（或讲师提前结束）→ 讲师端查看复盘 → 导出 CSV/JSON。
6. 单人模式：首页 → 单人练习 → 选角色 → 其余 AI 自动补位。

## 免责声明

本项目为教学工具，基于经典啤酒游戏规则改编，**不是 MIT 官方产品**，不包含也不主张任何 MIT 官方标识。