import type { ScenarioSummary } from './types.js';

/** 需求场景脚本：返回每周最终顾客需求数组（保底非负整数） */
export type ScenarioFn = (totalWeeks: number) => number[];

const classic: ScenarioFn = (n) => {
  const arr: number[] = [];
  for (let w = 1; w <= n; w++) {
    if (w <= 4) arr.push(4);
    else if (w < 12) arr.push(8);
    else arr.push(12); // 第12周起 +4 冲击
  }
  return arr;
};

const spike: ScenarioFn = (n) => {
  const arr: number[] = [];
  for (let w = 1; w <= n; w++) {
    if (w <= 4) arr.push(4);
    else if (w <= 6) arr.push(8);
    else arr.push(8 + w % 4); // 波动冲击
  }
  return arr;
};

const steady: ScenarioFn = (n) => Array.from({ length: n }, () => 4);

export const SCENARIOS: Record<
  string,
  { id: string; name: string; description: string; fn: ScenarioFn }
> = {
  classic: {
    id: 'classic',
    name: '经典牛鞭效应',
    description: '第1-4周稳定4箱，第5周跳升8箱，第12周+4冲击',
    fn: classic,
  },
  spike: {
    id: 'spike',
    name: '短期高峰冲击',
    description: '前期稳定，后半段每周小幅波动形成牛鞭放大',
    fn: spike,
  },
  steady: {
    id: 'steady',
    name: '稳定需求',
    description: '需求恒定4箱/周，作为对照组',
    fn: steady,
  },
};

export const scenarioList = (): ScenarioSummary[] =>
  Object.values(SCENARIOS).map(({ id, name, description }) => ({ id, name, description }));

export const getDemandScript = (scenarioId: string, totalWeeks: number): number[] => {
  const s = SCENARIOS[scenarioId] || SCENARIOS.classic;
  return s.fn(totalWeeks);
};