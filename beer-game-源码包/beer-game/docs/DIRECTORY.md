# 目录结构

```
beer-game/
├── README.md
├── docker-compose.yml
├── .env.example
├── package.json                 # workspace 根
├── tsconfig.base.json
├── docs/
│   ├── RULES.md  DATA_MODEL.md  SOCKET_EVENTS.md  REST_API.md  DIRECTORY.md  TESTING.md
├── packages/
│   └── shared/src/              # 共享类型与常量
│       ├── index.ts  types.ts  constants.ts  scenarios.ts
├── apps/
│   ├── server/                  # Node20 + Express + Socket.io + TS
│   │   ├── package.json  tsconfig.json  Dockerfile  .env.example
│   │   ├── prisma/schema.prisma  migrations/
│   │   └── src/
│   │       ├── index.ts config.ts db.ts
│   │       ├── engine/          # 权威规则引擎（纯函数，可单测）
│   │       │   ├── types.ts simulator.ts ai.ts scenarios.ts index.ts
│   │       │   └── __tests__/*.test.ts
│   │       ├── game/            # 房间与会话管理
│   │       │   ├── RoomManager.ts room.ts persistence.ts
│   │       ├── socket/          # Socket.io 绑定与鉴权
│   │       │   ├── index.ts auth.ts handlers.ts
│   │       ├── routes/          # REST 路由
│   │       ├── middleware/
│   │       └── utils/review.ts  # 复盘生成 + CSV/JSON 导出
│   └── web/                     # React + TS + Vite + Tailwind + PWA
│       ├── package.json vite.config.ts tailwind.config.js index.html
│       ├── public/manifest.webmanifest  sw.js  icons/
│       └── src/
│           ├── main.tsx App.tsx socket.ts api.ts env.ts
│           ├── lib/format.ts charts.ts export.ts
│           ├── pages/Home.tsx Lobby.tsx Player.tsx Review.tsx
│           └── components/*.tsx
```