import type { Role } from '@beer-game/shared';
import { ROLE_NAMES } from '@beer-game/shared';
import { classNames } from '../lib/format';

const styles: Record<Role, string> = {
  RETAILER: 'bg-emerald-100 text-emerald-700',
  WHOLESALER: 'bg-sky-100 text-sky-700',
  DISTRIBUTOR: 'bg-amber-100 text-amber-700',
  FACTORY: 'bg-purple-100 text-purple-700',
};

export function RoleBadge({ role, size = 'md' }: { role: Role; size?: 'sm' | 'md' }) {
  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full font-semibold',
        styles[role],
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {ROLE_NAMES[role]}
    </span>
  );
}

export function StatCard({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 min-w-0">
      <p className="text-xs text-slate-400 truncate">{label}</p>
      <p className={classNames('text-xl font-bold mt-1 truncate', accent ? 'text-brand-600' : 'text-slate-800')}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}