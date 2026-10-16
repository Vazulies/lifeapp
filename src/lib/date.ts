export const MIN = 60_000;
export const HOUR = 60 * MIN;

export const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day as YYYY-MM-DD. */
export function dateKey(d: Date | number = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export function parseKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** The last `n` day keys, oldest first, ending with `end`. */
export function lastDays(n: number, end = new Date()) {
  return Array.from({ length: n }, (_, i) => dateKey(addDays(end, i - n + 1)));
}

export const fmtTime = (t: number | Date) =>
  new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function fmtHM(minutes: number) {
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  return h ? `${h}h ${pad(m % 60)}m` : `${m}m`;
}

export const weekdayLetter = (key: string) => parseKey(key).toLocaleDateString([], { weekday: 'narrow' });

export function relDay(key: string) {
  const now = new Date();
  if (key === dateKey(now)) return 'Today';
  if (key === dateKey(addDays(now, -1))) return 'Yesterday';
  if (key === dateKey(addDays(now, 1))) return 'Tomorrow';
  return parseKey(key).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function nowHM() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Minutes from `from` (HH:MM) to `to` (HH:MM), wrapping past midnight. */
export function spanMinutes(from: string, to: string) {
  const toMin = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  const d = toMin(to) - toMin(from);
  return d <= 0 ? d + 1440 : d;
}

/** Local midnight on the Monday of the week containing `d`. */
export function weekStart(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

/** YYYY-MM for the month containing `d`. */
export const monthKey = (d: Date | number = new Date()) => dateKey(d).slice(0, 7);

/** Whole days from day key `a` to day key `b` (negative if `b` is earlier). */
export const daysBetween = (a: string, b: string) => Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 864e5);

export const fmtDate = (key: string, withYear = false) =>
  parseKey(key).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });
