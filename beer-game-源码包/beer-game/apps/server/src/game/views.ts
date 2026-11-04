import type { GameStatus, GlobalView, PlayerView, RoomPublic, Role, RoleWeekSummary } from '@beer-game/shared';
import { ROLE_NAMES } from '@beer-game/shared';
import type { RoomRecord, PlayerRecord } from '../game/RoomManager.js';
import type { RoleState } from '../engine/types.js';

export function toRoomPublic(room: RoomRecord): RoomPublic {
  return {
    roomId: room.roomId,
    code: room.code,
    status: room.status,
    week: room.currentWeek,
    totalWeeks: room.totalWeeks,
    scenarioId: room.scenarioId,
    settings: {
      totalWeeks: room.totalWeeks,
      initialInventory: 12,
      orderProcessingDelay: 1,
      shippingDelay: 2,
      productionDelay: 2,
      inventoryHoldCost: 0.5,
      backlogCost: 1.0,
    },
    players: room.players.map((p) => ({
      role: p.role as Role,
      name: p.name,
      isAI: p.isAI,
      connected: p.connected,
      aiStrategy: p.aiStrategy,
    })),
    gameOver: room.status === 'ended',
  };
}

/** 玩家私有视图：只含该角色自己的数据（隔离其他角色与未来需求） */
export function toPlayerView(room: RoomRecord, player: PlayerRecord, role: Role): PlayerView {
  const st = room.states[role];
  const cumulative = st.history.length ? st.history[st.history.length - 1].cumulativeCost : 0;
  const history: PlayerView['history'] = st.history.map((h) => ({
    week: h.week,
    orderReceived: h.orderReceived,
    orderPlaced: h.orderPlaced,
    inventory: h.inventory,
    backlog: h.backlog,
    incoming: h.shipped, // 本角色该周发出的货（自身视角的到货里程碑）
    inventoryCost: h.inventoryCost,
    backlogCost: h.backlogCost,
    weekCost: h.weekCost,
    cumulativeCost: h.cumulativeCost,
  }));
  return {
    roomId: room.roomId,
    week: room.currentWeek,
    totalWeeks: room.totalWeeks,
    role,
    status: room.status,
    inventory: st.inventory,
    incoming: sum(st.deliveries) + sum(st.production),
    orderReceived: st.lastOrderReceived,
    orderPlaced: st.lastOrderPlaced,
    backlog: st.backlog,
    inventoryCost: st.inventoryCost,
    backlogCost: st.backlogCost,
    weekCost: st.weekCost,
    cumulativeCost: cumulative,
    history,
    gameOver: room.status === 'ended',
  };
}

/** 讲师全局视图（含全链数据与需求脚本）——仅讲师获取，玩家接口不暴露 */
export function toGlobalView(room: RoomRecord): GlobalView {
  const roleSummaries: RoleWeekSummary[] = [];
  for (const role of Object.keys(room.states) as Role[]) {
    const st = room.states[role];
    st.history.forEach((h) => {
      roleSummaries.push({
        role,
        week: h.week,
        orderPlaced: h.orderPlaced,
        orderReceived: h.orderReceived,
        inventory: h.inventory,
        backlog: h.backlog,
        inventoryCost: h.inventoryCost,
        backlogCost: h.backlogCost,
        weekCost: h.weekCost,
        cumulativeCost: h.cumulativeCost,
      });
    });
  }
  return {
    room: toRoomPublic(room),
    roleSummaries,
    demandScript: room.demand,
  };
}

export function roleSeries(states: Record<Role, RoleState>, role: Role) {
  return states[role].history.map((h) => ({ ...h }));
}

export { ROLE_NAMES };

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

export type { GameStatus };