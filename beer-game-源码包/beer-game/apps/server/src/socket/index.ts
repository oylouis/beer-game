import type { Server, Socket } from 'socket.io';
import type { Role } from '@beer-game/shared';
import { ROLES, ROLE_NAMES } from '@beer-game/shared';
import { roomManager } from '../game/RoomManager.js';
import { toGlobalView, toPlayerView, toRoomPublic } from '../game/views.js';
import { buildReview } from '../game/review.js';

interface SocketData {
  roomId?: string;
  role?: Role;
  playerId?: string;
  isTeacher?: boolean;
}

let io: Server;

export function initSocket(server: Server): void {
  io = server;

  io.on('connection', (socket: Socket) => {
    const data = socket.data as SocketData;

    // ----- 讲师事件 -----
    socket.on('teacher:createRoom', (payload, ack) => {
      try {
        const { room, teacherToken } = roomManager.createRoom(payload?.name || '啤酒游戏教室', payload?.teacherName || '讲师', Number(payload?.totalWeeks) || 36);
        socket.data.isTeacher = true;
        socket.data.roomId = room.roomId;
        data.roomId = room.roomId;
        if (typeof ack === 'function') ack({ ok: true, roomId: room.roomId, code: room.code, teacherToken });
        subscribeRoom(socket, room.roomId);
        pushTeacher(socket, room.roomId);
      } catch (e) {
        ack?.({ ok: false, error: (e as Error).message });
      }
    });

    socket.on('teacher:join', async (payload, ack) => {
      const room = roomManager.getRoom(payload?.roomId);
      if (!room) return ack?.({ ok: false, error: '房间不存在' });
      if (!roomManager.verifyTeacher(room.roomId, payload?.teacherToken)) return ack?.({ ok: false, error: '讲师权限不足' });
      socket.data.isTeacher = true;
      socket.data.roomId = room.roomId;
      if (typeof ack === 'function') ack({ ok: true });
      subscribeRoom(socket, room.roomId);
      pushTeacher(socket, room.roomId);
    });

    socket.on('teacher:addAI', (payload, ack) => {
      const room = requireTeacher(socket, payload);
      if (!room) return ack?.({ ok: false, error: '权限不足' });
      if (!payload?.role || !ROLES.includes(payload.role)) return ack?.({ ok: false, error: '非法角色' });
      if (room.status !== 'idle' && room.status !== 'paused') return ack?.({ ok: false, error: '仅空闲/暂停可补AI' });
      roomManager.addAI(room.roomId, payload.role);
      ack?.({ ok: true });
      broadcastRoom(socket, room.roomId);
    });

    socket.on('teacher:removeAI', (payload, ack) => {
      const room = requireTeacher(socket, payload);
      if (!room) return ack?.({ ok: false, error: '权限不足' });
      if (!payload?.role) return ack?.({ ok: false, error: '缺少角色' });
      roomManager.removeAI(room.roomId, payload.role);
      ack?.({ ok: true });
      broadcastRoom(socket, room.roomId);
    });

    socket.on('teacher:kick', (payload, ack) => {
      const room = requireTeacher(socket, payload);
      if (!room) return ack?.({ ok: false, error: '权限不足' });
      if (!payload?.role) return ack?.({ ok: false, error: '缺少角色' });
      roomManager.kickPlayer(room.roomId, payload.role);
      ack?.({ ok: true });
      broadcastRoom(socket, room.roomId);
    });

    socket.on('teacher:start', (payload, ack) => {
      const room = requireTeacher(socket, payload);
      if (!room) return ack?.({ ok: false, error: '权限不足' });
      roomManager.start(room.roomId);
      ack?.({ ok: true });
      broadcastRoom(socket, room.roomId);
    });

    socket.on('teacher:pause', (payload, ack) => {
      const room = requireTeacher(socket, payload);
      if (!room) return ack?.({ ok: false, error: '权限不足' });
      roomManager.pause(room.roomId);
      ack?.({ ok: true });
      broadcastRoom(socket, room.roomId);
    });

    socket.on('teacher:resume', (payload, ack) => {
      const room = requireTeacher(socket, payload);
      if (!room) return ack?.({ ok: false, error: '权限不足' });
      roomManager.resume(room.roomId);
      ack?.({ ok: true });
      broadcastRoom(socket, room.roomId);
    });

    socket.on('teacher:step', (payload, ack) => {
      const room = requireTeacher(socket, payload);
      if (!room) return ack?.({ ok: false, error: '权限不足' });
      roomManager.step(room.roomId);
      ack?.({ ok: true });
      broadcastRoom(socket, room.roomId);
    });

    socket.on('teacher:reset', (payload, ack) => {
      const room = requireTeacher(socket, payload);
      if (!room) return ack?.({ ok: false, error: '权限不足' });
      roomManager.reset(room.roomId);
      ack?.({ ok: true });
      broadcastRoom(socket, room.roomId);
    });

    socket.on('teacher:scenario', (payload, ack) => {
      const room = requireTeacher(socket, payload);
      if (!room) return ack?.({ ok: false, error: '权限不足' });
      roomManager.setScenario(room.roomId, payload?.scenarioId);
      ack?.({ ok: true });
      broadcastRoom(socket, room.roomId);
    });

    socket.on('room:subscribe', (payload, ack) => {
      const room = roomManager.getRoom(payload?.roomId);
      if (!room) return ack?.({ ok: false, error: '房间不存在' });
      subscribeRoom(socket, room.roomId);
      ack?.({ ok: true });
      emitRoomState(socket, room.roomId);
    });

    // ----- 玩家事件 -----
    socket.on('player:join', async (payload, ack) => {
      const room = roomManager.getRoomByCode(payload?.code);
      if (!room) return ack?.({ ok: false, error: '房间不存在，请检查房间码' });
      if (room.status === 'ended') return ack?.({ ok: false, error: '游戏已结束' });
      const { player, error } = roomManager.addPlayer(room.roomId, payload?.name || '玩家', payload?.role);
      if (error) return ack?.({ ok: false, error });
      socket.data.roomId = room.roomId;
      socket.data.role = player.role!;
      socket.data.playerId = player.id;
      subscribeRoom(socket, room.roomId);
      if (typeof ack === 'function') ack({ ok: true, roomId: room.roomId, player: { id: player.id, role: player.role, name: player.name, token: player.sessionToken } });
      broadcastRoom(socket, room.roomId);
      emitPlayerState(socket, room.roomId, player.role!);
    });

    // 断线重连
    socket.on('player:reconnect', async (payload, ack) => {
      const player = roomManager.playerByToken(payload?.token);
      if (!player) return ack?.({ ok: false, error: '会话失效，请重新加入' });
      const room = roomManager.getRoom(player.roomId);
      if (!room) return ack?.({ ok: false, error: '房间不存在' });
      player.connected = true;
      socket.data.roomId = room.roomId;
      socket.data.role = player.role!;
      socket.data.playerId = player.id;
      subscribeRoom(socket, room.roomId);
      ack?.({ ok: true, roomId: room.roomId, player: { id: player.id, role: player.role, name: player.name, token: player.sessionToken } });
      broadcastRoom(socket, room.roomId);
      emitPlayerState(socket, room.roomId, player.role!);
    });

    socket.on('player:order', async (payload, ack) => {
      const player = roomManager.playerByToken(payload?.token);
      if (!player) return ack?.({ ok: false, error: '会话失效' });
      const room = roomManager.getRoom(player.roomId);
      if (!room) return ack?.({ ok: false, error: '房间不存在' });
      const order = Number(payload?.order);
      const res = roomManager.placeOrder(room.roomId, player.sessionToken, order);
      if (!res.ok) return ack?.({ ok: false, error: res.error });
      ack?.({ ok: true });
      emitPlayerState(socket, room.roomId, player.role!);
    });

    socket.on('disconnect', () => {
      // 标记玩家离线（多人模式掉线）
      if (data.roomId && data.playerId) {
        const room = roomManager.getRoom(data.roomId);
        const p = room?.players.find((x) => x.id === data.playerId);
        if (p) {
          p.connected = false;
          broadcastRoom(socket, data.roomId);
        }
      }
    });
  });

  // 用 roomManager 事件推送
  const originalEmit = roomManager.emit.bind(roomManager);
  (roomManager as any).emit = (roomId: string) => {
    originalEmit(roomId);
    io.to(roomKey(roomId)).emit('room:update', {});
  };
}

// ---------- helpers ----------
function roomKey(roomId: string) {
  return `room:${roomId}`;
}

function subscribeRoom(socket: Socket, roomId: string) {
  socket.join(roomKey(roomId));
}

function requireTeacher(socket: Socket, payload: any): ReturnType<typeof roomManager.getRoom> | null {
  if (!socket.data.isTeacher) return null;
  const room = roomManager.getRoom(payload?.roomId);
  if (!room || !roomManager.verifyTeacher(room.roomId, payload?.teacherToken)) return null;
  return room;
}

function broadcastRoom(socket: Socket, roomId: string) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;
  io.to(roomKey(roomId)).emit('room:update', toRoomPublic(room));
}

function pushTeacher(socket: Socket, roomId: string) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;
  socket.emit('teacher:global', toGlobalView(room));
}

function emitRoomState(socket: Socket, roomId: string) {
  const room = roomManager.getRoom(roomId);
  if (room) socket.emit('room:update', toRoomPublic(room));
}

function emitPlayerState(socket: Socket, roomId: string, role: Role) {
  const room = roomManager.getRoom(roomId);
  const player = room?.players.find((p) => p.role === role);
  if (room && player) {
    socket.emit('player:state', toPlayerView(room, player, role));
  }
}

export { buildReview };
export type { SocketData };