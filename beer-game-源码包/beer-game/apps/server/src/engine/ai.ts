import type { Role, AiStrategy, GameSettings } from '@beer-game/shared';
import type { RoleState } from './types.js';

/**
 * AI 合法策略：只能读取该角色自身可见状态（库存/在途/收到的订单/历史），
 * 绝不读取未来需求或全局库存。返回本周要下达的订单量（非负整数）。
 */
export interface AiContext {
  state: RoleState;
  lastCustomerDemand: number; // 仅零售商可用的已发生顾客需求（历史值，非未来）
  settings: GameSettings;
}

/**
 * order-up-to 策略：目标库存水平 = 平滑后的平均需求 x 安全系数。
 * 下单 = max(0, target - 手头库存 - 在途)。
 */
export function orderUpToStrategy(ctx: AiContext, targetWeeks: number): number {
  const { state, settings } = ctx;
  const avgDemand = averageRecentDemand(state, settings);
  const target = Math.max(4, Math.round(avgDemand * targetWeeks));
  const onHandAndInTransit = state.inventory + state.backlog + sum(state.deliveries) + sum(state.production);
  const order = Math.max(0, Math.round(target - onHandAndInTransit));
  return order;
}

/** 锚定策略：参考上周订单，在近期平均订单基础上做有限调整，避免剧烈波动。 */
export function anchoringStrategy(ctx: AiContext, adjustment: number): number {
  const { state, settings } = ctx;
  const recentAvg = averageRecentDemand(state, settings);
  const last = state.lastOrderPlaced || state.lastOrderReceived || recentAvg;
  const order = Math.max(0, Math.round(last + (recentAvg - last) * adjustment));
  return order;
}

export function aiOrderFor(strategy: AiStrategy, ctx: AiContext): number {
  switch (strategy) {
    case 'order_up_to':
      return orderUpToStrategy(ctx, 3);
    case 'anchoring':
      return anchoringStrategy(ctx, 0.5);
    default:
      return orderUpToStrategy(ctx, 3);
  }
}

function averageRecentDemand(state: RoleState, settings: GameSettings): number {
  const h = state.history;
  if (h.length === 0) return settings.initialInventory || 4;
  const window = h.slice(-4);
  const orders = window.map((x) => Math.max(x.orderReceived, x.shipped));
  const avg = orders.reduce((a, b) => a + b, 0) / orders.length;
  return Math.max(1, avg);
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

export function initAiContext(
  state: RoleState,
  role: Role,
  settings: GameSettings,
  lastCustomerDemand: number
): AiContext {
  void role;
  return { state, lastCustomerDemand, settings };
}