# === 后端：Node 20 + Express + Socket.io + Prisma ===
# 用法：docker build -f apps/server/Dockerfile -t beer-server .
# 或使用根目录 docker-compose.yml
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json ./
COPY packages ./packages
COPY apps/server/package.json ./apps/server/

FROM base AS deps
RUN npm install --no-audit --no-fund

FROM deps AS build
COPY apps/server ./apps/server
# 先构建 shared 包（server 运行时 import @beer-game/shared 需要其 dist）
RUN npm run build --workspace @beer-game/shared
RUN cd apps/server && npx prisma generate --schema prisma/schema.prisma
RUN cd apps/server && npx tsc -p tsconfig.json

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY apps/server/package.json ./apps/server/
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=build /app/apps/server/prisma ./apps/server/prisma
WORKDIR /app/apps/server
EXPOSE 4000
CMD ["node", "dist/index.js"]