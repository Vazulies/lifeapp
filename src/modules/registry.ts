import type { FC } from 'react';
import { META, type ModuleMeta } from './meta';
import { TasksScreen } from './Tasks';
import { HabitsScreen } from './Habits';
import { WaterScreen } from './Water';
import { CaffeineScreen } from './Caffeine';
import { SleepScreen } from './Sleep';
import { FocusScreen } from './Focus';
import { MoodScreen } from './Mood';
import { NotesScreen } from './Notes';
import { MoneyScreen } from './Money';
import { WorkoutsScreen } from './Workouts';
import { ReadingScreen } from './Reading';
import { WeightScreen } from './Weight';
import { CountdownsScreen } from './Countdowns';
import { BreatheScreen } from './Breathe';
import { useHabitsBadge, useTasksBadge } from './badges';

export interface AppModule extends ModuleMeta {
  Screen: FC<{ param?: string }>;
  /** Count shown on the Home screen icon, e.g. tasks due today. */
  useBadge?: () => number;
}

/** Order here is the order in the Library and on the Home screen. */
export const MODULES: AppModule[] = [
  { ...META.tasks, Screen: TasksScreen, useBadge: useTasksBadge },
  { ...META.habits, Screen: HabitsScreen, useBadge: useHabitsBadge },
  { ...META.water, Screen: WaterScreen },
  { ...META.caffeine, Screen: CaffeineScreen },
  { ...META.sleep, Screen: SleepScreen },
  { ...META.focus, Screen: FocusScreen },
  { ...META.mood, Screen: MoodScreen },
  { ...META.notes, Screen: NotesScreen },
  { ...META.money, Screen: MoneyScreen },
  { ...META.workouts, Screen: WorkoutsScreen },
  { ...META.reading, Screen: ReadingScreen },
  { ...META.weight, Screen: WeightScreen },
  { ...META.countdowns, Screen: CountdownsScreen },
  { ...META.breathe, Screen: BreatheScreen },
];

export const moduleById = (id: string) => MODULES.find((m) => m.id === id);
