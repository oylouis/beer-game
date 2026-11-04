import { getDemandScript, scenarioList } from '@beer-game/shared';
import type { Role, GameSettings } from '@beer-game/shared';

export const listScenarios = scenarioList;
export { getDemandScript };

export const DEFAULT_SETTINGS: GameSettings = {
  totalWeeks: 36,
  initialInventory: 12,
  orderProcessingDelay: 1,
  shippingDelay: 2,
  productionDelay: 2,
  inventoryHoldCost: 0.5,
  backlogCost: 1.0,
};

export function resolveSettings(partial?: Partial<GameSettings>): GameSettings {
  return { ...DEFAULT_SETTINGS, ...(partial || {}) };
}

export type { GameSettings, Role };