import { useStore } from '../lib/store';
import { HOUR, MIN } from '../lib/date';

export interface Dose {
  id: string;
  ts: number;
  mg: number;
  label: string;
  /** Key into the drink icon set. */
  icon?: string;
}

/** Average caffeine half-life in healthy adults; individual values range ~3–7h. */
export const HALF_LIFE = 5 * HOUR;
/** Level considered low enough not to disturb sleep. */
export const SLEEP_SAFE_MG = 50;

export function levelAt(doses: Dose[], t: number) {
  let mg = 0;
  for (const d of doses) {
    if (d.ts <= t && t - d.ts < 48 * HOUR) mg += d.mg * Math.pow(0.5, (t - d.ts) / HALF_LIFE);
  }
  return mg;
}

/** First time at or after `from` when the level drops to `threshold`, or null if it already has. */
export function clearsAt(doses: Dose[], from: number, threshold = SLEEP_SAFE_MG) {
  if (levelAt(doses, from) <= threshold) return null;
  for (let t = from; t < from + 48 * HOUR; t += 5 * MIN) {
    if (levelAt(doses, t) <= threshold) return t;
  }
  return null;
}

const EMPTY: Dose[] = [];
export const useDoses = () => useStore<Dose[]>('caffeine', EMPTY);
