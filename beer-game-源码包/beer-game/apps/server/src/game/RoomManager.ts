import { randomBytes, randomInt, createHash } from 'crypto';
import type { Role, GameStatus, GameSettings, AiStrategy } from '@beer-game/shared';
import { ROLES, ROLE_NAMES, AiStrategyList } from '@beer-game/shared';
import type { RoleState } from '../engine/types.js';
import { initState, advanceWeek } from '../engine/simulator.js';
import { aiOrderFor } from '../engine/ai.js';
import { getDemandScript, resolveSettings } from '../engine/scenarios.js';

export interface PlayerRecord {
  id: string;
  roomId: string;
  role: Role | null;
  name: string;
  sessionToken: string;
  isAI: boolean;
  aiStrategy: AiStrategy;
  connected: boolean;
}

export interface RoomRecord {
  roomId: string;
  code: string;
  name: string;
  status: GameStatus;
  currentWeek: number;
  totalWeeks: number;
  scenarioId: string;
  teacherTokenHash: string;
  teacherName: string;
  players: PlayerRecord[];
  states: Record<Role, RoleState>;
  demand: number[];
  orderLocked: boolean; // 本周订单是否已锁定（等待全体下单后推进）
  created: number;
}

type Listener = () => void;

const sessions = new Map<string, PlayerRecord>();

function genCode(len: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += alphabet[randomInt(alphabet.length)];
  return s;
}

export function genSessionToken(): string {
  return `st_${randomBytes(18).toString('hex')}`;
}

export function hashToken(t: string): string {
  return createHash('sha256').update(t).digest('hex');
}

export class RoomManager {
  private rooms = new Map<string, RoomRecord>();
  private byCode = new Map<string, string>();
  private listeners = new Map<string, Set<Listener>>();

  constructor() {}

  // ---- 事件 ----
  subscribe(roomId: string, fn: Listener): () => void {
    if (!this.listeners.has(roomId)) this.listeners.set(roomId, new Set());
    this.listeners.get(roomId)!.add(fn);
    return () => this.listeners.get(roomId)?.delete(fn);
  }
  emit(roomId: string) {
    this.listeners.get(roomId)?.forEach((fn) => {
      try {
        fn();
      } catch {
        /* ignore */
      }
    });
  }

  // ---- 房间创建 ----
  createRoom(name: string, teacherName: string, totalWeeks?: number): { room: RoomRecord; teacherToken: string } {
    const code = this.genUniqueCode();
    const teacherToken = `tt_${randomBytes(18).toString('hex')}`;
    const settings = resolveSettings({ totalWeeks: totalWeeks || 36 });
    const demand = getDemandScript('classic', settings.totalWeeks);
    const states = {} as Record<Role, RoleState>;
    for (const r of ROLES) states[r] = initState(r, settings);

    const room: RoomRecord = {
      roomId: randomBytes(8).toString('hex'),
      code,
      name,
      status: 'idle',
      currentWeek: 0,
      totalWeeks: settings.totalWeeks,
      scenarioId: 'classic',
      teacherTokenHash: hashToken(teacherToken),
      teacherName,
      players: [],
      states,
      demand,
      orderLocked: false,
      created: Date.now(),
    };
    this.rooms.set(room.roomId, room);
    this.byCode.set(room.code, room.roomId);
    return { room, teacherToken };
  }

  private genUniqueCode(codeLen?: number): string {
    let code = genCode(codeLen || 6);
    while (this.byCode.has(code)) code = genCode(codeLen || 6);
    return code;
  }

  getRoomByCode(code: string): RoomRecord | undefined {
    const id = this.byCode.get(code.toUpperCase());
    return id ? this.rooms.get(id) : undefined;
  }

  getRoom(roomId: string): RoomRecord | undefined {
    return this.rooms.get(roomId);
  }

  verifyTeacher(roomId: string, teacherToken: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    return hashToken(teacherToken) === room.teacherTokenHash;
  }

  // ---- 玩家 ----
  addPlayer(roomId: string, name: string, requestedRole?: Role): { player: PlayerRecord; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { player: null as any, error: '房间不存在' };
    if (room.status === 'ended') return { player: null as any, error: '游戏已结束' };

    // 自动分配第一个空角色
    let role = requestedRole || null;
    if (!role) {
      for (const r of ROLES) {
        if (!room.players.some((p) => p.role === r)) {
          role = r;
          break;
        }
      }
      if (!role) return { player: null as any, error: '房间已满' };
    }
    if (!ROLES.includes(role)) return { player: null as any, error: '非法角色' };
    const taken = room.players.find((p) => p.role === role);
    if (taken) return { player: null as any, error: `该角色（${ROLE_NAMES[role]}）已被占用` };

    const token = genSessionToken();
    const player: PlayerRecord = {
      id: randomBytes(8).toString('hex'),
      roomId,
      role,
      name,
      sessionToken: token,
      isAI: false,
      aiStrategy: 'order_up_to',
      connected: true,
    };
    room.players.push(player);
    sessions.set(token, player);
    return { player };
  }

  // AI 补位
  addAI(roomId: string, role: Role): PlayerRecord | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.players.some((p) => p.role === role)) return null;
    const token = genSessionToken();
    const strat: AiStrategy = Math.random() > 0.5 ? 'order_up_to' : 'anchoring';
    const player: PlayerRecord = {
      id: randomBytes(8).toString('hex'),
      roomId,
      role,
      name: `AI·${ROLE_NAMES[role]}`,
      sessionToken: token,
      isAI: true,
      aiStrategy: AiStrategyList.includes(strat) ? strat : 'order_up_to',
      connected: true,
    };
    room.players.push(player);
    sessions.set(token, player);
    return player;
  }

  kickPlayer(roomId: string, role: Role): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const idx = room.players.findIndex((p) => p.role === role && !p.isAI);
    if (idx >= 0) {
      const [p] = room.players.splice(idx, 1);
      sessions.delete(p.sessionToken);
    }
  }

  removeAI(roomId: string, role: Role): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const idx = room.players.findIndex((p) => p.role === role && p.isAI);
    if (idx >= 0) {
      const [p] = room.players.splice(idx, 1);
      sessions.delete(p.sessionToken);
    }
  }

  playerByToken(token: string): PlayerRecord | undefined {
    return sessions.get(token);
  }

  setConnected(token: string, connected: boolean): PlayerRecord | undefined {
    const p = sessions.get(token);
    if (p) {
      p.connected = connected;
      this.emit(p.roomId);
    }
    return p;
  }

  // ---- 订单 ----
  placeOrder(roomId: string, token: string, order: number): { ok: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    const player = sessions.get(token);
    if (!room) return { ok: false, error: '房间不存在' };
    if (!player || player.roomId !== roomId) return { ok: false, error: '身份无效' };
    if (room.status !== 'playing' && room.status !== 'paused') return { ok: false, error: '游戏未在进行' };
    if (room.orderLocked) return { ok: false, error: '本周订单已锁定' };
    if (!Number.isInteger(order) || order < 0 || order > 100000) return { ok: false, error: '订单必须为非负整数' };

    // 记录到该角色状态（orderPlaced）由推进时落库；这里只做玩家主动下单的登记
    // 实际下单在 advance 时把 orderInput 应用到 states。此处以 pendingOrder 存于 player
    (player as any)._pendingOrder = order;
    return { ok: true };
  }

  // ---- 流程控制 ----
  start(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.status === 'ended') {
      // 重开：重置
      this.reset(roomId);
      const r = this.rooms.get(roomId)!;
      r.status = 'playing';
      r.orderLocked = false;
      return;
    }
    room.status = 'playing';
    room.orderLocked = false;
    this.emit(roomId);
  }

  pause(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.status = 'paused';
      this.emit(roomId);
    }
  }

  resume(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.status = 'playing';
      room.orderLocked = false;
      this.emit(roomId);
    }
  }

  step(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    this.advanceOnce(room);
  }

  /** 核心：推进一周。所有角色先收集订单（人类 pendingOrder + AI 决策），再交给权威引擎。 */
  advanceOnce(room: RoomRecord): boolean {
    if (room.status === 'ended') return false;
    const settings = resolveSettings({
      totalWeeks: room.totalWeeks,
      initialInventory: 12,
      orderProcessingDelay: 1,
      shippingDelay: 2,
      productionDelay: 2,
      inventoryHoldCost: 0.5,
      backlogCost: 1.0,
    });

    // 收集订单：人类玩家用其 pendingOrder（未提交则用 0），AI 用策略
    const orderInput = {} as Record<Role, number>;
    const roleOf = new Map<Role, PlayerRecord>();
    for (const p of room.players) if (p.role) roleOf.set(p.role, p);

    for (const role of ROLES) {
      const p = roleOf.get(role);
      if (!p) {
        orderInput[role] = 0;
      } else if (p.isAI) {
        orderInput[role] = aiOrderFor(p.aiStrategy, {
          state: room.states[role],
          lastCustomerDemand: room.currentWeek > 0 ? room.demand[room.currentWeek - 1] : 0,
          settings,
        });
      } else {
        orderInput[role] = Math.max(0, Math.floor(((p as any)._pendingOrder as number) || 0));
        (p as any)._pendingOrder = null;
      }
    }

    const weekIdx = room.currentWeek; // 0-based 下一周
    const demand = room.demand[weekIdx] ?? 0;
    const { states } = advanceWeek(room.states, settings, orderInput, demand);
    room.states = states;
    room.currentWeek += 1;
    room.orderLocked = room.currentWeek >= room.totalWeeks;

    if (room.currentWeek >= room.totalWeeks) {
      room.status = 'ended';
    }
    this.emit(room.roomId);
    return room.status === 'ended';
  }

  end(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.status = 'ended';
      this.emit(roomId);
    }
  }

  reset(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const settings = resolveSettings({ totalWeeks: room.totalWeeks });
    room.demand = getDemandScript(room.scenarioId, room.totalWeeks);
    room.states = {} as Record<Role, RoleState>;
    for (const r of ROLES) room.states[r] = initState(r, settings);
    room.currentWeek = 0;
    room.orderLocked = false;
    room.status = 'idle';
    // 清除玩家 pendingOrder
    for (const p of room.players) (p as any)._pendingOrder = null;
    this.emit(roomId);
  }

  setScenario(roomId: string, scenarioId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.scenarioId = scenarioId;
    if (room.status === 'idle') {
      room.demand = getDemandScript(scenarioId, room.totalWeeks);
    }
    this.emit(roomId);
  }

  /** 讲师全局透视（仅在 ended 或讲师权限下调用） */
  requireGlobal(roomId: string): RoomRecord | undefined {
    return this.rooms.get(roomId);
  }
}

export const roomManager = new RoomManager();