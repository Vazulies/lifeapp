import { useState } from 'react';
import { Activity, Bike, Dumbbell, Flower2, Footprints, PersonStanding, SlidersHorizontal, Trash2, Trophy, Waves, Zap, type LucideIcon } from 'lucide-react';
import { useStore } from '../lib/store';
import { dateKey, fmtHM, lastDays, relDay, weekdayLetter, weekStart } from '../lib/date';
import { uid } from '../lib/id';
import { useSettings } from '../lib/settings';
import { haptic, removeWithUndo, toast } from '../lib/feedback';
import { Bars, Empty, Page, Ring, SectionTitle, Sheet, Stepper } from '../components/ui';
import { META } from './meta';

interface Workout {
  id: string;
  date: string;
  ts: number;
  type: string;
  minutes: number;
  note: string;
}

const EMPTY: Workout[] = [];
const useWorkouts = () => useStore<Workout[]>('workouts', EMPTY);

const TYPES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'run', label: 'Run', icon: Footprints },
  { id: 'walk', label: 'Walk', icon: PersonStanding },
  { id: 'strength', label: 'Strength', icon: Dumbbell },
  { id: 'cycling', label: 'Cycling', icon: Bike },
  { id: 'swim', label: 'Swim', icon: Waves },
  { id: 'yoga', label: 'Yoga', icon: Flower2 },
  { id: 'hiit', label: 'HIIT', icon: Zap },
  { id: 'sport', label: 'Sport', icon: Trophy },
  { id: 'other', label: 'Other', icon: Activity },
];
const typeOf = (id: string) => TYPES.find((t) => t.id === id) ?? TYPES[TYPES.length - 1];

function thisWeek(items: Workout[]) {
  const start = dateKey(weekStart());
  return items.filter((w) => w.date >= start);
}

function WorkoutForm({ type, onDone }: { type: string; onDone: () => void }) {
  const [items, setItems] = useWorkouts();
  const last = [...items].reverse().find((w) => w.type === type);
  const [minutes, setMinutes] = useState(last?.minutes ?? 30);
  const [date, setDate] = useState(dateKey());
  const [note, setNote] = useState('');
  const t = typeOf(type);
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!date || date > dateKey()) return;
        haptic([8, 40, 8]);
        setItems((xs) => [...xs, { id: uid(), date, ts: Date.now(), type, minutes, note: note.trim() }]);
        toast(`${t.label} logged · ${fmtHM(minutes)}`);
        onDone();
      }}
    >
      <div className="card form inset">
        <Stepper label="Duration" unit="min" value={minutes} min={5} max={600} step={5} onChange={setMinutes} />
      </div>
      <div className="field-row">
        <label className="field">
          <span>Date</span>
          <input type="date" value={date} max={dateKey()} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Note</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </label>
      </div>
      <button className="btn primary block" type="submit" disabled={!date || date > dateKey()}>
        Save {t.label.toLowerCase()}
      </button>
    </form>
  );
}

export function WorkoutsScreen() {
  const [items, setItems] = useWorkouts();
  const [{ workoutGoal }, update] = useSettings();
  const [logging, setLogging] = useState<string | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const week = thisWeek(items);
  const weekMinutes = week.reduce((s, w) => s + w.minutes, 0);
  const activeDays = new Set(week.map((w) => w.date)).size;
  const today = dateKey();
  const bars = lastDays(7).map((d) => ({ label: weekdayLetter(d), value: items.filter((w) => w.date === d).reduce((s, w) => s + w.minutes, 0), highlight: d === today }));
  const history = [...items].sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts).slice(0, 30);

  return (
    <Page
      meta={META.workouts}
      actions={
        <button className="icon-btn" onClick={() => setGoalOpen(true)} aria-label="Weekly goal">
          <SlidersHorizontal size={20} />
        </button>
      }
    >
      <section className="card hero">
        <span className="eyebrow">This week</span>
        <Ring value={weekMinutes} max={workoutGoal} size={188} stroke={12}>
          <span className="hero-num">
            {weekMinutes}
            <span className="unit">min</span>
          </span>
          <span className="muted small">of {workoutGoal} min</span>
        </Ring>
        <p className="hero-note">
          {week.length} workout{week.length === 1 ? '' : 's'} · {activeDays} active day{activeDays === 1 ? '' : 's'}
        </p>
      </section>

      <SectionTitle>Log a workout</SectionTitle>
      <div className="preset-grid">
        {TYPES.map((t) => (
          <button key={t.id} className="preset" onClick={() => setLogging(t.id)}>
            <t.icon size={20} />
            <span className="preset-name">{t.label}</span>
          </button>
        ))}
      </div>

      <SectionTitle>Last 7 days</SectionTitle>
      <section className="card">
        <Bars data={bars} format={(v) => String(v)} />
      </section>

      <SectionTitle>History</SectionTitle>
      {history.length === 0 ? (
        <Empty icon={META.workouts.icon} title="No workouts yet" text="Pick a type above to log your first one." />
      ) : (
        <ul className="card list">
          {history.map((w) => {
            const t = typeOf(w.type);
            return (
              <li key={w.id} className="log-item">
                <span className="tile sm">
                  <t.icon size={15} />
                </span>
                <span className="log-main">
                  <span>{t.label}</span>
                  <span className="muted small">
                    {relDay(w.date)}
                    {w.note && ` · ${w.note}`}
                  </span>
                </span>
                <span className="strong tabular">{fmtHM(w.minutes)}</span>
                <button className="icon-btn subtle" onClick={() => removeWithUndo(setItems, (x) => x.id === w.id, 'Workout deleted')} aria-label={`Delete ${t.label} on ${relDay(w.date)}`}>
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet color={META.workouts.color} open={!!logging} onClose={() => setLogging(null)} title={logging ? typeOf(logging).label : ''}>
        {logging && <WorkoutForm key={logging} type={logging} onDone={() => setLogging(null)} />}
      </Sheet>
      <Sheet color={META.workouts.color} open={goalOpen} onClose={() => setGoalOpen(false)} title="Weekly goal">
        <div className="stack">
          <div className="card form inset">
            <Stepper label="Minutes per week" unit="min" value={workoutGoal} min={30} max={1500} step={10} onChange={(workoutGoal) => update({ workoutGoal })} />
          </div>
          <p className="muted small">Health guidelines suggest at least 150 minutes of moderate activity a week.</p>
          <button className="btn primary block" onClick={() => setGoalOpen(false)}>
            Done
          </button>
        </div>
      </Sheet>
    </Page>
  );
}
