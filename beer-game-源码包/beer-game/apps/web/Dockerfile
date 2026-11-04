# === 前端多阶段构建（基于 Monorepo：shared 先编译出 dist，再构建 web）===
FROM node:20-alpine AS deps
WORKDIR /app
# 复制 workspace 元数据
COPY package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN npm install --no-audit --no-fund

# 先构建 shared → 产出 dist（web 运行时引用的 @beer-game/shared dist）
FROM deps AS shared-build
COPY packages/shared ./packages/shared
RUN npm run build --workspace @beer-game/shared

FROM shared-build AS web-build
COPY apps/web ./apps/web
RUN npm run build -w apps/web

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=web-build /app/apps/web/dist ./app
EXPOSE 80
# 极简静态服务器（SPA fallback 到 index.html）
CMD ["node", "-e", "const h=require('http'),f=require('fs'),p=require('path'),r='/app';h.createServer((q,s)=>{let u=q.url==='/'?'/index.html':q.url.split('?')[0];let f0=p.join(r,u);f.readFile(f0,(e,d)=>{if(e){f.readFile(p.join(r,'/index.html'),(e2,d2)=>{s.writeHead(e2?404:200,{'Content-Type':'text/html'});s.end(e2?'not found':d2);});return;}const t=u.endsWith('.js')?'application/javascript':u.endsWith('.css')?'text/css':u.endsWith('.png')?'image/png':u.endsWith('.webmanifest')?'application/manifest+json':u.endsWith('.json')?'application/json':'text/html';s.writeHead(200,{'Content-Type':t});s.end(d);});}).listen(80);"]