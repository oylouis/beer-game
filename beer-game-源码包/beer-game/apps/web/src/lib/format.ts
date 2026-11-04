export function formatMoney(n: number): string {
  return `¥${(Math.round(n * 100) / 100).toFixed(2)}`;
}

export function classNames(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(' ');
}