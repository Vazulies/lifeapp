import { useCallback, useMemo } from 'react';
import { setValue, useStore } from './store';

export interface Settings {
  name: string;
  theme: 'system' | 'light' | 'dark';
  waterGoal: number;
  caffeineLimit: number;
  sleepGoal: number;
  /** Ids of the apps on the Home screen. */
  installed: string[];
  onboarded: boolean;
  haptics: boolean;
  /** ISO 4217 code used by Money. */
  currency: string;
  /** Monthly spending budget; 0 means none. */
  budget: number;
  /** Weekly workout goal in minutes. */
  workoutGoal: number;
  weightUnit: 'kg' | 'lb';
  /** Target weight in kg; 0 means none. */
  weightGoal: number;
}

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  theme: 'system',
  waterGoal: 2000,
  caffeineLimit: 400,
  sleepGoal: 8,
  installed: ['tasks', 'habits', 'water', 'focus'],
  onboarded: false,
  haptics: true,
  currency: 'USD',
  budget: 0,
  workoutGoal: 150,
  weightUnit: 'kg',
  weightGoal: 0,
};

const EMPTY: Partial<Settings> = {};

export function useSettings() {
  const [stored, set] = useStore<Partial<Settings>>('settings', EMPTY);
  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...stored }), [stored]);
  const update = useCallback((patch: Partial<Settings>) => set((prev) => ({ ...prev, ...patch })), [set]);
  return [settings, update] as const;
}

export function setInstalled(id: string, on: boolean) {
  setValue<Partial<Settings>>('settings', EMPTY, (s) => {
    const current = s.installed ?? DEFAULT_SETTINGS.installed;
    if (on === current.includes(id)) return s;
    return { ...s, installed: on ? [...current, id] : current.filter((x) => x !== id) };
  });
}
