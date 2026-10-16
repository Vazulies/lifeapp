import { useState } from 'react';
import {
  Apple,
  Bed,
  Bike,
  BookOpen,
  Brain,
  Check,
  CigaretteOff,
  CircleCheck,
  Code,
  Dog,
  Droplet,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  Languages,
  Leaf,
  Music,
  PenLine,
  PhoneOff,
  Pill,
  Plus,
  Salad,
  Sparkles,
  Sun,
  Trash2,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { addDays, dateKey, lastDays, relDay, weekdayLetter } from '../lib/date';
import { uid } from '../lib/id';
import { haptic, removeWithUndo } from '../lib/feedback';
import { Empty, Page, Sheet } from '../components/ui';
import { META } from './meta';

interface Habit {
  id: string;
  name: string;
  icon?: string;
  createdAt: number;
  /** Day keys on which the habit was done. */
  days: Record<string, true>;
}

const EMPTY: Habit[] = [];
const useHabits = () => useStore<Habit[]>('habits', EMPTY);

const ICONS: Record<string, LucideIcon> = {
  water: Droplet,
  read: BookOpen,
  walk: Footprints,
  bike: Bike,
  gym: Dumbbell,
  mind: Brain,
  breathe: Wind,
  nature: Leaf,
  fruit: Apple,
  salad: Salad,
  sleep: Bed,
  write: PenLine,
  music: Music,
  smoke: CigaretteOff,
  sun: Sun,
  tidy: Sparkles,
  meds: Pill,
  dog: Dog,
  love: Heart,
  offline: PhoneOff,
  code: Code,
  language: Languages,
};
const iconOf = (h: Habit) => ICONS[h.icon ?? ''] ?? CircleCheck;

function streak(h: Habit) {
  let d = new Date();
  if (!h.days[dateKey(d)]) d = addDays(d, -1);
  let n = 0;
  while (h.days[dateKey(d)]) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

function toggleDay(habits: Habit[], id: string, key: string) {
  return habits.map((h) => {
    if (h.id !== id) return h;
    const days = { ...h.days };
    if (days[key]) delete days[key];
    else days[key] = true;
    return { ...h, days };
  });
}

function HabitForm({ habit, onDone }: { habit: Habit | null; onDone: () => void }) {
  const [, setHabits] = useHabits();
  const [name, setName] = useState(habit?.name ?? '');
  const [icon, setIcon] = useState(habit?.icon && ICONS[habit.icon] ? habit.icon : 'read');

  const save = () => {
    const n = name.trim();
    if (!n) return;
    haptic();
    setHabits((hs) =>
      habit ? hs.map((h) => (h.id === habit.id ? { ...h, name: n, icon } : h)) : [...hs, { id: uid(), name: n, icon, createdAt: Date.now(), days: {} }],
    );
    onDone();
  };

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label className="field">
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Read 10 pages" autoFocus={!habit} />
      </label>
      <div className="field">
        <span>Icon</span>
        <div className="icon-grid" role="radiogroup" aria-label="Icon">
          {Object.entries(ICONS).map(([key, Icon]) => (
            <button
              type="button"
              key={key}
              className={`icon-opt${key === icon ? ' on' : ''}`}
              onClick={() => setIcon(key)}
              role="radio"
              aria-checked={key === icon}
              aria-label={key}
            >
              <Icon size={20} />
            </button>
          ))}
        </div>
      </div>
      <button className="btn primary block" type="submit" disabled={!name.trim()}>
        {habit ? 'Save' : 'Add habit'}
      </button>
      {habit && (
        <button
          type="button"
          className="btn ghost danger-text block"
          onClick={() => {
            onDone();
            removeWithUndo(setHabits, (h) => h.id === habit.id, `${habit.name} deleted`);
          }}
        >
          <Trash2 size={17} /> Delete habit
        </button>
      )}
    </form>
  );
}

export function HabitsScreen() {
  const [habits, setHabits] = useHabits();
  const [editing, setEditing] = useState<Habit | 'new' | null>(null);
  const today = dateKey();
  const week = lastDays(7);
  const doneCount = habits.filter((h) => h.days[today]).length;
  const check = (id: string, day: string, wasDone: boolean) => {
    haptic(wasDone ? 6 : [8, 40, 8]);
    setHabits((hs) => toggleDay(hs, id, day));
  };

  return (
    <Page
      meta={META.habits}
      actions={
        <button className="icon-btn" onClick={() => setEditing('new')} aria-label="New habit">
          <Plus />
        </button>
      }
    >
      {habits.length === 0 ? (
        <Empty
          icon={META.habits.icon}
          title="No habits yet"
          text="Small daily wins add up. Start with one."
          action={
            <button className="btn primary" onClick={() => setEditing('new')}>
              Add a habit
            </button>
          }
        />
      ) : (
        <>
          <p className="muted small center">{doneCount === habits.length ? 'All done today' : `${doneCount} of ${habits.length} done today`}</p>
          <ul className="habit-list">
            {habits.map((h) => {
              const s = streak(h);
              const done = !!h.days[today];
              const Icon = iconOf(h);
              return (
                <li key={h.id} className="card habit">
                  <div className="habit-top">
                    <button className="habit-name" onClick={() => setEditing(h)} aria-label={`Edit ${h.name}`}>
                      <span className="tile">
                        <Icon size={20} />
                      </span>
                      <span className="habit-text">
                        <strong>{h.name}</strong>
                        <small className={s > 0 ? 'streak on' : 'streak'}>
                          <Flame size={12} /> {s} day{s === 1 ? '' : 's'}
                        </small>
                      </span>
                    </button>
                    <button className={`habit-check${done ? ' on' : ''}`} onClick={() => check(h.id, today, done)} role="checkbox" aria-checked={done} aria-label={`${h.name} today`}>
                      <Check size={22} className="bold" />
                    </button>
                  </div>
                  <div className="habit-week">
                    {week.map((d) => (
                      <button
                        key={d}
                        className={`day-dot${h.days[d] ? ' on' : ''}${d === today ? ' today' : ''}`}
                        onClick={() => check(h.id, d, !!h.days[d])}
                        role="checkbox"
                        aria-checked={!!h.days[d]}
                        aria-label={`${h.name}, ${relDay(d)}`}
                      >
                        {weekdayLetter(d)}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <Sheet color={META.habits.color} open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New habit' : 'Edit habit'}>
        {editing !== null && <HabitForm key={editing === 'new' ? 'new' : editing.id} habit={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </Page>
  );
}
