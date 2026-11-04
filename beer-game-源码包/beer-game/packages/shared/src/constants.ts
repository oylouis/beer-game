/** 全局常量：四种角色 */
export const ROLES = ['RETAILER', 'WHOLESALER', 'DISTRIBUTOR', 'FACTORY'] as const;
export type Role = (typeof ROLES)[number];

/** 游戏的权威状态机 */
export const GameStatusList = ['idle', 'playing', 'paused', 'ended'] as const;
export type GameStatus = (typeof GameStatusList)[number];

/** AI 可选合法策略（不读取未来需求，只依据自身可见状态） */
export const AiStrategyList = ['order_up_to', 'anchoring'] as const;
export type AiStrategy = (typeof AiStrategyList)[number];

/** 默认参数 */
export const DEFAULT_SETTINGS = {
  totalWeeks: 36,
  initialInventory: 12,
  // 初始在途：按稳定需求 4 箱/周 预设 6 周，保证前几周可运行
  initialInTransitWeeks: 6,
  initialDemand: 4,
  // 订单处理延迟（进入上游订单队列到被处理）
  orderProcessingDelay: 1,
  // 发货/生产延迟
  shippingDelay: 2,
  productionDelay: 2,
  inventoryHoldCost: 0.5,
  backlogCost: 1.0,
  shippingLeadTime: 2, // 运输延迟（发货后到到达）
  // 顾客需求脚本（每周需求量，由 scenario 派生）
} as const;

export type GameSettings = {
  totalWeeks: number;
  initialInventory: number;
  orderProcessingDelay: number;
  shippingDelay: number;
  productionDelay: number;
  inventoryHoldCost: number;
  backlogCost: number;
};

export const ROLE_NAMES: Record<Role, string> = {
  RETAILER: '零售商',
  WHOLESALER: '批发商',
  DISTRIBUTOR: '分销商',
  FACTORY: '工厂',
};

/** 上游关系：该角色从哪个角色进货。FACTORY 无上游。 */
export const UPSTREAM: Record<Role, Role | null> = {
  RETAILER: 'WHOLESALER',
  WHOLESALER: 'DISTRIBUTOR',
  DISTRIBUTOR: 'FACTORY',
  FACTORY: null,
};