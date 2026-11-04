import type { Role, GameSettings, AiStrategy } from './constants.js';

/** 玩家在房间中的可见状态（信息隔离后） */
export interface PlayerView {
  roomId: string;
  week: number;
  totalWeeks: number;
  role: Role;
  status: string;
  inventory: number;
  incoming: number; // 在途
  orderReceived: number; // 收到的下游订单
  orderPlaced: number; // 本玩家已下的订单
  backlog: number;
  inventoryCost: number;
  backlogCost: number;
  weekCost: number;
  cumulativeCost: number;
  history: WeekRecord[]; // 仅自身历史
  gameOver: boolean;
}

export interface WeekRecord {
  week: number;
  orderReceived: number;
  orderPlaced: number;
  inventory: number;
  backlog: number;
  incoming: number;
  inventoryCost: number;
  backlogCost: number;
  weekCost: number;
  cumulativeCost: number;
}

/** 每种角色每周的汇总（讲师全局可见，复盘用） */
export interface RoleWeekSummary {
  role: Role;
  week: number;
  orderPlaced: number;
  orderReceived: number;
  inventory: number;
  backlog: number;
  inventoryCost: number;
  backlogCost: number;
  weekCost: number;
  cumulativeCost: number;
}

export interface RoomPublic {
  roomId: string;
  code: string;
  status: string;
  week: number;
  totalWeeks: number;
  scenarioId: string;
  settings: GameSettings;
  players: PlayerInfo[];
  gameOver: boolean;
}

export interface PlayerInfo {
  role: Role;
  name: string;
  isAI: boolean;
  connected: boolean;
  aiStrategy?: AiStrategy | null;
}

export interface GlobalView {
  room: RoomPublic;
  roleSummaries: RoleWeekSummary[];
  demandScript: number[]; // 全场需求脚本（仅讲师/复盘可见）
}

export interface ScenarioSummary {
  id: string;
  name: string;
  description: string;
}

export interface ReviewData {
  roomId: string;
  code: string;
  varianceMultiplier: number;
  totalCosts: Record<Role, number>;
  roleSummaries: RoleWeekSummary[];
  demandScript: number[];
  discussionQuestions: string[];
}