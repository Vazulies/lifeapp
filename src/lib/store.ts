import { useCallback, useSyncExternalStore } from 'react';

// Tiny persistent store: every key is a JSON value in localStorage, shared by
// all components that subscribe to it, and synced across browser tabs.

const PREFIX = 'lifeapp:';
const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();

export type Updater<T> = T | ((prev: T) => T);

export function getValue<T>(key: string, fallback: T): T {
  if (cache.has(key)) return cache.get(key) as T;
  let value = fallback;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw !== null) value = JSON.parse(raw) as T;
  } catch {
    // Corrupt or unavailable storage: fall back to the default.
  }
  cache.set(key, value);
  return value;
}

export function setValue<T>(key: string, fallback: T, update: Updater<T>) {
  const prev = getValue(key, fallback);
  const next = typeof update === 'function' ? (update as (p: T) => T)(prev) : update;
  if (Object.is(next, prev)) return;
  cache.set(key, next);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(next));
  } catch {
    // Quota exceeded or private mode: keep the in-memory value.
  }
  emit(key);
}

function emit(key: string) {
  listeners.get(key)?.forEach((l) => l());
}

function subscribe(key: string, listener: () => void) {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(listener);
  return () => set.delete(listener);
}

window.addEventListener('storage', (e) => {
  if (e.key === null) {
    cache.clear();
    listeners.forEach((_, k) => emit(k));
  } else if (e.key.startsWith(PREFIX)) {
    const key = e.key.slice(PREFIX.length);
    cache.delete(key);
    emit(key);
  }
});

export function useStore<T>(key: string, fallback: T) {
  const value = useSyncExternalStore(
    useCallback((l: () => void) => subscribe(key, l), [key]),
    () => getValue(key, fallback),
  );
  const set = useCallback((u: Updater<T>) => setValue(key, fallback, u), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return [value, set] as const;
}

function ownKeys() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX)) keys.push(k);
  }
  return keys;
}

export function exportAll() {
  const data: Record<string, unknown> = {};
  for (const k of ownKeys()) data[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k)!);
  return { app: 'lifeapp', version: 1, exportedAt: new Date().toISOString(), data };
}

export function importAll(backup: unknown) {
  const data = (backup as { app?: string; data?: Record<string, unknown> })?.data;
  if ((backup as { app?: string })?.app !== 'lifeapp' || !data || typeof data !== 'object') {
    throw new Error('This file is not a LifeApp backup.');
  }
  clearAll();
  for (const [k, v] of Object.entries(data)) localStorage.setItem(PREFIX + k, JSON.stringify(v));
}

export function clearAll() {
  for (const k of ownKeys()) localStorage.removeItem(k);
  cache.clear();
}
