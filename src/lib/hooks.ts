import { useEffect, useState } from 'react';

/**
 * Current time, re-rendering every `ms` while enabled and when the page becomes
 * visible again. The clock is read during render so it is never stale, even on
 * the first render after `enabled` flips on.
 */
export function useNow(ms = 1000, enabled = true) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const tick = () => setTick((n) => n + 1);
    const t = setInterval(tick, ms);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [ms, enabled]);
  return Date.now();
}
