import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import type { RoleWeekSummary } from '@beer-game/shared';
import { ROLE_NAMES } from '@beer-game/shared';
import type { Role } from '@beer-game/shared';

/** 订单量曲线：展示牛鞭效应 */
export function OrderChart({ data }: { data: RoleWeekSummary[] }) {
  const series = normalizeByWeek(data);
  const lines = (['RETAILER', 'WHOLESALER', 'DISTRIBUTOR', 'FACTORY'] as Role[]).map((r) => (
    <Line key={r} type="monotone" dataKey={r} name={ROLE_NAMES[r]} stroke={COLOR[r]} strokeWidth={2} dot={false} />
  ));
  return (
    <div className="w-full" style={{ minWidth: 480 }}>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={series} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="week" label={{ value: '周', position: 'insideBottomRight', offset: -5 }} />
          <YAxis />
          <Tooltip />
          <Legend />
          {lines}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function InventoryChart({ data }: { data: RoleWeekSummary[] }) {
  const roles = (['RETAILER', 'WHOLESALER', 'DISTRIBUTOR', 'FACTORY'] as Role[]);
  const series = normalizeInventory(data);
  void roles;
  return (
    <div className="w-full" style={{ minWidth: 480 }}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={series} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip />
          <Legend />
          {(['RETAILER', 'WHOLESALER', 'DISTRIBUTOR', 'FACTORY'] as Role[]).map((r) => (
            <Bar key={r} dataKey={r} name={ROLE_NAMES[r]} fill={COLOR[r]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CostChart({ data }: { data: RoleWeekSummary[] }) {
  const series = normalizeByWeek(data);
  return (
    <div className="w-full" style={{ minWidth: 480 }}>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={series} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip />
          <Legend />
          {(['RETAILER', 'WHOLESALER', 'DISTRIBUTOR', 'FACTORY'] as Role[]).map((r) => (
            <Line key={r} type="monotone" dataKey={r} name={`${ROLE_NAMES[r]}(累计)`} stroke={COLOR[r]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const COLOR: Record<Role, string> = {
  RETAILER: '#10b981',
  WHOLESALER: '#0ea5e9',
  DISTRIBUTOR: '#f59e0b',
  FACTORY: '#8b5cf6',
};

/** 按周对齐每个角色的 orderPlaced */
function normalizeByWeek(data: RoleWeekSummary[]): Record<string, any>[] {
  const weeks = new Set(data.map((d) => d.week));
  const sorted = [...weeks].sort((a, b) => a - b);
  return sorted.map((week) => {
    const row: Record<string, any> = { week };
    for (const d of data) if (d.week === week) row[d.role] = d.orderPlaced;
    return row;
  });
}

function normalizeInventory(data: RoleWeekSummary[]): Record<string, any>[] {
  const weeks = new Set(data.map((d) => d.week));
  const sorted = [...weeks].sort((a, b) => a - b);
  return sorted.map((week) => {
    const row: Record<string, any> = { week };
    for (const d of data) if (d.week === week) row[d.role] = d.inventory;
    return row;
  });
}