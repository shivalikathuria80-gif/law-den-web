export const inr = (value: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export const compactInr = (value: number): string => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return `₹${value}`;
};

export const longDate = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const relativeDate = (iso: string, now = new Date('2026-09-18T00:00:00')): string => {
  const then = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const days = Math.round((now.getTime() - then.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
};

export const responseTime = (hours: number): string =>
  hours <= 2 ? 'Usually replies within 2 hours'
    : hours <= 8 ? `Usually replies within ${hours} hours`
      : hours <= 24 ? 'Usually replies within a day'
        : 'Usually replies within 2 days';

export const initials = (name: string): string =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');

export const todayIso = (): string => new Date().toISOString().slice(0, 10);
