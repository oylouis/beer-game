import type { Role, GameSettings } from '@beer-game/shared';
import { ROLES } from '@beer-game/shared';
import type { RoleState } from './types.js';

/** 发货去向：本角色把货发给谁。RETAILER 面向顾客不上链。 */
export const shipTo: Record<Role, Role | null> = {
  WHOLESALER: 'RETAILER',
  DISTRIBUTOR: 'WHOLESALER',
  FACTORY: 'DISTRIBUTOR',
  RETAILER: null,
};

/** 司机收到订单来源：每个角色的上游（供应商）。FACTORY 生产自足。 */
export const supplierOf: Record<Role, Role | null> = {
  WHOLESALER: 'DISTRIBUTOR',
  DISTRIBUTOR: 'FACTORY',
  RETAILER: 'WHOLESALER',
  FACTORY: null,
};

/** 初始化角色状态 */
export function initState(role: Role, settings: GameSettings): RoleState {
  // 在途发货：定长环形缓冲（长度=shippingDelay），预置稳定需求 4 箱/周
  const deliveries = Array.from({ length: settings.shippingDelay }, () => 4);
  // 工厂生产管线的在途缓冲
  const production = role === 'FACTORY' ? Array.from({ length: settings.productionDelay }, () => 4) : [];
  return {
    role,
    inventory: settings.initialInventory,
    backlog: 0,
    deliveries,
    production,
    lastShipped: 0,
    lastOrderReceived: 0,
    lastOrderPlaced: 0,
    inventoryCost: 0,
    backlogCost: 0,
    weekCost: 0,
    cumulativeCost: 0,
    history: [],
  };
}

export function cloneState(s: RoleState): RoleState {
  return { ...s, deliveries: [...s.deliveries], production: [...(s.production || [])], history: s.history.map((h) => ({ ...h })) };
}

/**
 * 权威状态机：推进一周。
 * 延迟模型（规则一致）：
 *  - 环形缓冲 ring 保证「发货方 push 到尾部的货，经过 exactly shippingDelay 轮 shift 后到队首进入库存」。
 *  - 每轮步骤：1)各角色 shift到货+push0；2)计算收到订单；3)满足需求；4)把发货写入目标 ring 尾部；5)成本与下单、生产。
 *  - 订单处理延迟 orderProcessingDelay 固定 1 周：供应商本周收到 下游上周 lastOrderPlaced。
 *  - 工厂生产延迟 productionDelay：生产指令写入自己 production ring。
 */
export function advanceWeek(
  prev: Record<Role, RoleState>,
  settings: GameSettings,
  orderInput: Record<Role, number>,
  customerDemand: number
): { states: Record<Role, RoleState>; demandUsed: number } {
  const next = {} as Record<Role, RoleState>;
  for (const r of ROLES) next[r] = cloneState(prev[r]);

  // 阶段1：接收到货（ring shift 出队首加入库存）
  for (const r of ROLES) {
    const s = next[r];
    if (s.deliveries.length) {
      const arrive = s.deliveries[0] ?? 0;
      s.deliveries.shift();
      s.deliveries.push(0); // 保持定长，新 push 的货 shippingDelay 轮后到
      s.inventory += arrive;
    }
    // 工厂生产管线到货
    if (r === 'FACTORY' && s.production.length) {
      const arriveP = s.production[0] ?? 0;
      s.production.shift();
      s.production.push(0);
      s.inventory += arriveP;
    }
  }

  // 阶段2：本周收到的订单
  const received: Record<Role, number> = {
    RETAILER: customerDemand,
    WHOLESALER: prev.RETAILER.lastOrderPlaced,
    DISTRIBUTOR: prev.WHOLESALER.lastOrderPlaced,
    FACTORY: prev.DISTRIBUTOR.lastOrderPlaced,
  };

  // 阶段3：满足需求/订单，记录缺货
  for (const r of ROLES) {
    const s = next[r];
    const demand = received[r] + s.backlog;
    const ship = Math.min(s.inventory, demand);
    s.inventory -= ship;
    s.backlog = demand - ship;
    s.lastShipped = ship;
    s.lastOrderReceived = received[r];
  }

  // 阶段4：把发货写入目标角色 ring 尾部（本轮已 push 的 0 槽替换为发货量）
  for (const r of ROLES) {
    const t = shipTo[r];
    if (t) {
      const target = next[t];
      if (target.deliveries.length) {
        target.deliveries[target.deliveries.length - 1] = next[r].lastShipped;
      }
    }
  }

  // 阶段5：成本 + 记录订单 + 生产 + 订单延迟
  const orderUsed: Record<Role, number> = { RETAILER: 0, WHOLESALER: 0, DISTRIBUTOR: 0, FACTORY: 0 };
  for (const r of ROLES) {
    const s = next[r];
    s.inventoryCost = s.inventory * settings.inventoryHoldCost;
    s.backlogCost = s.backlog * settings.backlogCost;
    s.weekCost = s.inventoryCost + s.backlogCost;
    s.cumulativeCost += s.weekCost;

    const order = Math.max(0, Math.floor(orderInput[r]));
    orderUsed[r] = order;
    s.lastOrderPlaced = order;
    s.history.push({
      week: prev[r].history.length + 1,
      shipped: s.lastShipped,
      orderReceived: s.lastOrderReceived,
      orderPlaced: order,
      inventory: s.inventory,
      backlog: s.backlog,
      inventoryCost: s.inventoryCost,
      backlogCost: s.backlogCost,
      weekCost: s.weekCost,
      cumulativeCost: s.cumulativeCost,
    });

    // 工厂生产：指令写入 production ring 尾部（productionDelay 轮后到货）
    if (r === 'FACTORY' && s.production.length) {
      s.production[s.production.length - 1] = order;
    }
  }
  void settings;
  void supplierOf;

  return { states: next, demandUsed: customerDemand };
}

export { ROLES, initState as createRoleState };