import type { ReviewData, Role, RoleWeekSummary } from '@beer-game/shared';
import { ROLES, ROLE_NAMES } from '@beer-game/shared';
import type { RoomRecord } from './RoomManager.js';
import type { RoleState } from '../engine/types.js';

/** 计算某序列的方差放大倍数（牛鞭效应）：订单方差 / 顾客需求方差 */
export function computeVarianceMultiplier(states: Record<Role, RoleState>, demand: number[]): number {
  const demandVar = variance(demand.filter((d) => d > 0));
  // 使用链上最远离需求端的一环（工厂）订单方差，并链上所有角色，取最大放大倍数为代表
  const retailers = states.RETAILER.history.map((h) => h.orderPlaced);
  const lastRoleOrders = states.FACTORY.history.map((h) => h.orderPlaced).filter((x) => x !== 0);
  const refOrders = lastRoleOrders.length ? lastRoleOrders : retailers;
  const orderVar = variance(refOrders);
  if (demandVar === 0) return orderVar === 0 ? 1 : 999;
  return round(orderVar / demandVar, 2);
}

function roleWeekData(states: Record<Role, RoleState>): RoleWeekSummary[][] {
  return ROLES.map((role) =>
    states[role].history.map((h) => ({
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
    }))
  );
}

export function buildReview(room: RoomRecord): ReviewData {
  const roleData = roleWeekData(room.states);
  const totalCosts = {} as Record<Role, number>;
  for (const r of ROLES) {
    totalCosts[r] = room.states[r].cumulativeCost;
  }
  const varianceMultiplier = computeVarianceMultiplier(room.states, room.demand);
  return {
    roomId: room.roomId,
    code: room.code,
    varianceMultiplier,
    totalCosts,
    roleSummaries: roleData.flat(),
    demandScript: room.demand,
    discussionQuestions: buildQuestions(room),
  };
}

function buildQuestions(room: RoomRecord): string[] {
  const qs: string[] = [];
  qs.push(
    `牛鞭效应在本局放大 ${computeVarianceMultiplier(room.states, room.demand)} 倍：越往上游订单波动越大。讨论订单波动从零售商到工厂如何被逐级放大。`
  );
  qs.push('各角色累计成本对比：哪个链条环节成本最高？原因是库存积压还是缺货丢失？');
  qs.push('延迟（订单1周、发货2周、生产2周）如何影响库存决策？若延迟缩短会有什么变化？');
  qs.push('如果所有人共享全链信息（信息透明），牛鞭效应会减弱吗？为什么经典游戏里信息不透明？');
  qs.push('在本次需求冲击（第12周+4）前后，各角色的下单行为有何差异？');
  qs.push('如何设计更优策略（如协助贴标、VMI、信息共享）来缓解牛鞭效应？');
  return qs;
}

/** 关键周表：选取需求冲击周与链上订单明显偏离周 */
export function keyWeeks(room: RoomRecord): Array<{ week: number; detail: string }> {
  const out: Array<{ week: number; detail: string }> = [];
  const demand = room.demand;
  for (let i = 0; i < room.currentWeek; i++) {
    if (i > 0 && demand[i] !== demand[i - 1]) {
      out.push({ week: i + 1, detail: `顾客需求变化：${demand[i - 1]} -> ${demand[i]}` });
    }
  }
  return out.slice(0, 8);
}

export function toCsv(review: ReviewData): string {
  const header = ['角色', '周', '收到订单', '下达订单', '库存', '缺货', '库存成本', '缺货成本', '本周成本', '累计成本'];
  const lines = [header.join(',')];
  for (const row of review.roleSummaries.sort((a, b) => (ROLES.indexOf(a.role) - ROLES.indexOf(b.role)) * 1000 + (a.week - b.week))) {
    lines.push(
      [ROLE_NAMES[row.role], row.week, row.orderReceived, row.orderPlaced, row.inventory, row.backlog, row.inventoryCost, row.backlogCost, row.weekCost, row.cumulativeCost].join(',')
    );
  }
  // 追加牛鞭效应
  lines.push('');
  lines.push(`牛鞭效应放大倍数,${review.varianceMultiplier}`);
  lines.push('');
  lines.push('角色,累计成本(总)');
  for (const r of ROLES) lines.push(`${ROLE_NAMES[r]},${review.totalCosts[r]}`);
  return lines.join('\n');
}

function variance(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const v = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
  return v;
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/** 供复盘导出的关键周/讨论使用 */
export { variance, round };