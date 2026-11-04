import type { Role } from '@beer-game/shared';

/** 单个角色的运行状态（服务端权威） */
export interface RoleState {
  role: Role;
  inventory: number; // 当前可用库存（>=0）
  backlog: number; // 未满足的累计缺货
  deliveries: number[]; // 在途发货环形缓冲（长度=shippingDelay），尾部=最新发货、头部=即将到货
  production: number[]; // 工厂生产管线环形缓冲（长度=productionDelay），仅 FACTORY 使用
  lastShipped: number; // 本周发往下游/顾客的箱数
  lastOrderReceived: number; // 本周收到的下游订单
  lastOrderPlaced: number; // 本周下达的订单（FACTORY 为生产指令）
  inventoryCost: number;
  backlogCost: number;
  weekCost: number;
  cumulativeCost: number;
  history: RoleHistoryEntry[];
}

export interface RoleHistoryEntry {
  week: number;
  shipped: number;
  orderReceived: number;
  orderPlaced: number;
  inventory: number;
  backlog: number;
  inventoryCost: number;
  backlogCost: number;
  weekCost: number;
  cumulativeCost: number;
}