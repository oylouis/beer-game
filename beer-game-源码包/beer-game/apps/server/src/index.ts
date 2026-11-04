import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { config, hasDatabase } from './config.js';
import { ensureDbConnected } from './db.js';
import { api } from './routes/api.js';
import { initSocket } from './socket/index.js';
import { roomManager } from './game/RoomManager.js';
import { toGlobalView } from './game/views.js';

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, db: hasDatabase() }));
app.use('/api', api);

// 讲师全局端点（供新版用，token 走 header）
app.get('/api/teacher/:roomId/global', (req, res) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: '房间不存在' });
  const token = String(req.headers['x-teacher-token'] || '');
  if (!roomManager.verifyTeacher(room.roomId, token)) return res.status(403).json({ error: '讲师权限不足' });
  res.json(toGlobalView(room));
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: config.corsOrigin, methods: ['GET', 'POST'] },
});

initSocket(io);

async function main() {
  const dbOk = await ensureDbConnected();
  void dbOk;
  httpServer.listen(config.port, () => {
    console.log(`[beer-game] server listening on :${config.port} (env=${config.nodeEnv})`);
  });
}

main().catch((e) => {
  console.error('启动失败', e);
  process.exit(1);
});