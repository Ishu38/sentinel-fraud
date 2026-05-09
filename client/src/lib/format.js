export function formatMoney(amount, currency = 'USD') {
  if (typeof amount !== 'number') return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(p, digits = 2) {
  if (typeof p !== 'number') return '—';
  return `${(p * 100).toFixed(digits)}%`;
}

const RTF = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const STEPS = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
];

export function timeAgo(iso) {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  for (const [unit, secs] of STEPS) {
    if (Math.abs(diff) >= secs || unit === 'second') {
      return RTF.format(-Math.round(diff / secs), unit);
    }
  }
  return '';
}

export function tierFor(probability) {
  if (probability >= 0.85) return { id: 'critical', label: 'Critical risk', color: '#ff2e63' };
  if (probability >= 0.6) return { id: 'high', label: 'High risk', color: '#ff5570' };
  if (probability >= 0.3) return { id: 'medium', label: 'Elevated', color: '#ffb84d' };
  return { id: 'low', label: 'Low risk', color: '#2bd9a6' };
}
