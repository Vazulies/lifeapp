import { navigate } from './router';
import { haptic } from './feedback';

// Opening an app remembers where it was tapped so its window can zoom out of
// (and later back into) that spot.

let origin: { x: number; y: number } | null = null;

export function openApp(id: string, from?: Element | null) {
  if (from) {
    const r = from.getBoundingClientRect();
    origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  } else origin = null;
  haptic(8);
  navigate('/m/' + id);
}

export function takeOrigin() {
  const o = origin;
  origin = null;
  return o;
}
