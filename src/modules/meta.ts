import { BookOpen, Coffee, Dumbbell, GlassWater, Hourglass, ListTodo, Moon, NotebookPen, Repeat, Scale, Smile, Timer, Wallet, Wind, type LucideIcon } from 'lucide-react';

export interface ModuleMeta {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  tagline: string;
  description: string;
  features: string[];
}

const meta = <T extends Record<string, Omit<ModuleMeta, 'id'>>>(m: T) =>
  Object.fromEntries(Object.entries(m).map(([id, v]) => [id, { id, ...v }])) as { [K in keyof T]: ModuleMeta };

export const META = meta({
  tasks: {
    name: 'Tasks',
    icon: ListTodo,
    color: '#E5672E',
    tagline: 'Plan today, tomorrow and someday',
    description: 'A calm to-do list that sorts itself by what is due. Flag what matters and let the rest wait.',
    features: ['Today, Upcoming and Someday lists', 'Due dates and important flags', 'Overdue tasks surface automatically'],
  },
  habits: {
    name: 'Habits',
    icon: Repeat,
    color: '#2F9A5A',
    tagline: 'Build streaks, one day at a time',
    description: 'Check off the small things you want to do every day and watch your streaks grow.',
    features: ['One-tap daily check-off', 'Backfill the last seven days', 'Streak tracking'],
  },
  water: {
    name: 'Water',
    icon: GlassWater,
    color: '#1D9A84',
    tagline: 'Stay hydrated through the day',
    description: 'Log a glass in one tap and see how close you are to your daily goal.',
    features: ['Quick add 150, 250 or 500 ml', 'Daily goal ring', 'Weekly overview'],
  },
  caffeine: {
    name: 'Caffeine',
    icon: Coffee,
    color: '#9A6A3C',
    tagline: 'Know what is still in your system',
    description: 'Log coffee, tea and energy drinks. LifeApp estimates how much caffeine is still active and when it stops affecting your sleep.',
    features: ['One-tap drink presets', 'Live caffeine decay estimate', 'Sleep-safe time and daily limit'],
  },
  sleep: {
    name: 'Sleep',
    icon: Moon,
    color: '#C95679',
    tagline: 'How long and how well you sleep',
    description: 'Log bedtime, wake time and quality to understand your rest. Works with Caffeine to flag late intake.',
    features: ['Duration and quality log', 'Seven-night chart and sleep debt', 'Late caffeine warnings'],
  },
  focus: {
    name: 'Focus',
    icon: Timer,
    color: '#DD4545',
    tagline: 'A Pomodoro timer for deep work',
    description: 'Work in focused 25-minute sessions with short breaks in between. Keeps running while you use other apps.',
    features: ['25, 5 and 15 minute cycles', 'Notification and chime when done', 'Daily and weekly focus time'],
  },
  mood: {
    name: 'Mood',
    icon: Smile,
    color: '#D49A06',
    tagline: 'A daily check-in with yourself',
    description: 'Record how you feel in one tap, add a note if you like, and see patterns over the weeks.',
    features: ['Five-point mood scale', 'Optional journal note', 'Five-week mood calendar'],
  },
  notes: {
    name: 'Notes',
    icon: NotebookPen,
    color: '#76921F',
    tagline: 'Quick notes and ideas',
    description: 'A simple place for lists, ideas and thoughts. Saves as you type.',
    features: ['Pin important notes', 'Instant search', 'Autosave'],
  },
  money: {
    name: 'Money',
    icon: Wallet,
    color: '#5E5A53',
    tagline: 'Track spending against a budget',
    description: 'Log expenses in seconds, see where your money goes by category, and stay inside a monthly budget.',
    features: ['Quick add with categories', 'Monthly budget with what is left', 'Spending by category and by day'],
  },
  workouts: {
    name: 'Workouts',
    icon: Dumbbell,
    color: '#B4462B',
    tagline: 'Log training and hit a weekly goal',
    description: 'Record runs, gym sessions, rides and more. A weekly minutes goal keeps you consistent.',
    features: ['Nine workout types', 'Weekly minutes goal ring', 'Seven-day activity chart'],
  },
  reading: {
    name: 'Reading',
    icon: BookOpen,
    color: '#A0742A',
    tagline: 'Books, pages and progress',
    description: 'Keep a shelf of what you are reading, what is next and what you have finished. Log pages as you go.',
    features: ['Progress per book', 'Pages read per day', 'Want to read and finished shelves'],
  },
  weight: {
    name: 'Weight',
    icon: Scale,
    color: '#5F7A6B',
    tagline: 'Weigh-ins and your trend',
    description: 'Log your weight and see the trend over time, with changes over the last week and month.',
    features: ['Kilograms or pounds', 'Trend chart', 'Optional goal weight'],
  },
  countdowns: {
    name: 'Countdowns',
    icon: Hourglass,
    color: '#8F8A2E',
    tagline: 'Days until what matters',
    description: 'Count down to trips, birthdays and deadlines. Yearly events roll over automatically.',
    features: ['Days left at a glance', 'Yearly repeat for birthdays', 'Past events kept for reference'],
  },
  breathe: {
    name: 'Breathe',
    icon: Wind,
    color: '#9E8C7A',
    tagline: 'Guided breathing in a minute',
    description: 'Slow down with guided breathing patterns. Follow the circle as it grows and shrinks.',
    features: ['Box, 4-7-8 and calm patterns', 'One, three or five minutes', 'Mindful minutes tracked'],
  },
});
