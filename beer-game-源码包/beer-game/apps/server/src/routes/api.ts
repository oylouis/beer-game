import { Router, type Request, Response } from 'express';
import { ROLES } from '@beer-game/shared';
import { roomManager } from '../game/RoomManager.js';
import { listScenarios } from '../engine/scenarios.js';
import { toPlayerView, toRoomPublic } from '../game/views.js';
import { buildReview, toCsv } from '../game/review.js';

export const api = Router();

api.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'beer-game-server', ts: Date.now() });
});

api.get('/scenarios', (_req: Request, res: Response) => {
  res.json(listScenarios());
});

/** 创建房间：返回 roomId、房间码、讲师 Token */
api.post('/rooms', (req: Request, res: Response) => {
  const name = (req.body?.name || '啤酒游戏教室').slice(0, 40);
  const teacherName = (req.body?.teacherName || '讲师').slice(0, 20);
  const totalWeeks = Number(req.body?.totalWeeks) || 36;
  const { room, teacherToken } = roomManager.createRoom(name, teacherName, totalWeeks);
  res.json({
    roomId: room.roomId,
    code: room.code,
    teacherToken,
    room: toRoomPublic(room),
  });
});

/** 查询房间 */
api.get('/rooms/:code', (req: Request, res: Response) => {
  const room = roomManager.getRoomByCode(req.params.code.toUpperCase());
  if (!room) return res.status(404).json({ error: '房间不存在' });
  res.json(toRoomPublic(room));
});

/** 玩家加入房间：分配空闲角色 */
api.post('/rooms/:code/join', (req: Request, res: Response) => {
  const room = roomManager.getRoomByCode(req.params.code.toUpperCase());
  if (!room) return res.status(404).json({ error: '房间不存在' });
  const name = (req.body?.name || '玩家').slice(0, 20);
  const requestedRole = req.body?.role;
  const { player, error } = roomManager.addPlayer(room.roomId, name, requestedRole);
  if (error) return res.status(400).json({ error });
  res.json({ player: { id: player.id, role: player.role, name: player.name, token: player.sessionToken }, room: toRoomPublic(room) });
});

/** 讲师盘点：全局数据与牛鞭效应（须校验讲师 token） */
api.get('/rooms/:roomId/review', (req: Request, res: Response) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: '房间不存在' });
  const token = String(req.headers['x-teacher-token'] || '');
  if (!roomManager.verifyTeacher(room.roomId, token)) return res.status(403).json({ error: '讲师权限不足' });
  if (room.status !== 'ended') return res.status(400).json({ error: '游戏尚未结束，复盘仅结束后可用' });
  res.json(buildReview(room));
});

/** 导出 CSV 复盘 */
api.get('/rooms/:roomId/export.csv', (req: Request, res: Response) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room || room.status !== 'ended') return res.status(404).json({ error: '复盘不可用' });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="beer-review-${room.code}.csv"`);
  res.send('\uFEFF' + toCsv(buildReview(room)));
});

/** 导出 JSON 复盘 */
api.get('/rooms/:roomId/export.json', (req: Request, res: Response) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room || room.status !== 'ended') return res.status(404).json({ error: '复盘不可用' });
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="beer-review-${room.code}.json"`);
  res.json(buildReview(room));
});

/** 单人模式：创建后自动补 3 个 AI，然后进入 */
api.post('/practice', (req: Request, res: Response) => {
  const chosenRole = req.body?.role as (typeof ROLES)[number] | undefined;
  const name = (req.body?.name || '学员').slice(0, 20);
  if (chosenRole && !ROLES.includes(chosenRole)) {
    return res.status(400).json({ error: '非法角色' });
  }
  const { room, teacherToken } = roomManager.createRoom('单人练习', name, 36);
  // 先让玩家加入指定角色，再 AI 补位其余
  if (chosenRole) {
    const r = roomManager.getRoom(room.roomId)!;
    // 先移除自动无角色，改为直接 addPlayer with role
    const { player, error } = roomManager.addPlayer(room.roomId, name, chosenRole);
    if (error) return res.status(400).json({ error });
    for (const role of ROLES) {
      if (role !== chosenRole) roomManager.addAI(room.roomId, role);
    }
    void r;
    return res.json({
      roomId: room.roomId,
      code: room.code,
      player: { id: player.id, role: player.role, name, token: player.sessionToken },
      room: toRoomPublic(roomManager.getRoom(room.roomId)!),
    });
  }
  // 未指定角色：自动加入零售商，其余 AI
  const { player, error } = roomManager.addPlayer(room.roomId, name, 'RETAILER');
  if (error) return res.status(400).json({ error });
  for (const role of ROLES) {
    if (role !== 'RETAILER') roomManager.addAI(room.roomId, role);
  }
  res.json({
    roomId: room.roomId,
    code: room.code,
    player: { id: player.id, role: player.role, name, token: player.sessionToken },
    room: toRoomPublic(roomManager.getRoom(room.roomId)!),
  });
});

/** 玩家自身视角（用 session token 轮询兜底，主通道为 socket） */
api.get('/rooms/:roomId/player/:token', (req: Request, res: Response) => {
  const room = roomManager.getRoom(req.params.roomId);
  const player = roomManager.playerByToken(req.params.token);
  if (!room || !player || player.roomId !== room.roomId) return res.status(404).json({ error: '未找到' });
  res.json(toPlayerView(room, player, player.role!));
});