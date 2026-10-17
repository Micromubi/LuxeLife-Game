export function money(n: number, compact = false) {
  const neg = n < 0;
  const v = Math.abs(n);
  let s: string;
  if (compact && v >= 1e9) s = (v / 1e9).toFixed(2) + 'B';
  else if (compact && v >= 1e6) s = (v / 1e6).toFixed(2) + 'M';
  else if (compact && v >= 1e4) s = (v / 1e3).toFixed(1) + 'K';
  else s = Math.round(v).toLocaleString('en-US');
  return (neg ? '−$' : '$') + s;
}
export const pct = (n: number, d = 1) => (n * 100).toFixed(d) + '%';
export const fmtHour = (h: number) => `Day ${Math.floor(h / 24) + 1}, ${String(h % 24).padStart(2, '0')}:00`;
