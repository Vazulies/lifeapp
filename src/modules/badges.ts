import { useStore } from '../lib/store';
import { dateKey } from '../lib/date';

// Counts shown as badges on Home screen icons. Kept apart from the screen
// components so those files only export components (keeps Fast Refresh working).

const NONE: never[] = [];

export function useTasksBadge() {
  const [tasks] = useStore<{ done: boolean; due?: string }[]>('tasks', NONE);
  const today = dateKey();
  return tasks.filter((t) => !t.done && !!t.due && t.due <= today).length;
}

export function useHabitsBadge() {
  const [habits] = useStore<{ days: Record<string, true> }[]>('habits', NONE);
  const today = dateKey();
  return habits.filter((h) => !h.days[today]).length;
}
