import { useState } from 'react';
import { Apple, Coffee, Plus, SlidersHorizontal, Trash2, Utensils } from 'lucide-react';
import { useStore } from '../lib/store';
import { dateKey, lastDays, relDay, weekdayLetter } from '../lib/date';
import { uid } from '../lib/id';
import { haptic, removeWithUndo, toast } from '../lib/feedback';
import { Bars, Empty, Page, Ring, SectionTitle, Segmented, Sheet, Stat, Stepper } from '../components/ui';
import { META } from './meta';

type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface CalorieEntry {
  id: string;
  date: string;
  ts: number;
  kcal: number;
  meal: Meal;
  note: string;
}

const EMPTY: CalorieEntry[] = [];
const useCalories = () => useStore<CalorieEntry[]>('calories', EMPTY);
const useCalorieGoal = () => useStore<number>('calories-goal', 2200);

const MEALS: { id: Meal; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
];

const mealIcon = (meal: Meal) => {
  if (meal === 'breakfast') return Coffee;
  if (meal === 'snack') return Apple;
  return Utensils;
};

const sum = (items: CalorieEntry[]) => items.reduce((s, x) => s + x.kcal, 0);

function AddCalories({ onDone }: { onDone: () => void }) {
  const [, setItems] = useCalories();
  const [kcal, setKcal] = useState('450');
  const [meal, setMeal] = useState<Meal>('lunch');
  const [note, setNote] = useState('');
  const [day, setDay] = useState(dateKey());
  const n = Math.round(Number(kcal));
  const valid = n > 0 && n <= 10_000 && !!day && day <= dateKey();

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        haptic();
        setItems((xs) => [...xs, { id: uid(), date: day, ts: Date.now(), kcal: n, meal, note: note.trim() }]);
        toast(`${n} kcal added`);
        onDone();
      }}
    >
      <label className="amount-field">
        <span className="muted small">Calories (kcal)</span>
        <input value={kcal} onChange={(e) => setKcal(e.target.value)} inputMode="numeric" placeholder="0" autoFocus aria-label="Calories" />
      </label>
      <Segmented
        label="Meal"
        value={meal}
        onChange={setMeal}
        options={MEALS.map((m) => ({ value: m.id, label: m.label }))}
      />
      <div className="field-row">
        <label className="field">
          <span>Note</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </label>
        <label className="field">
          <span>Date</span>
          <input type="date" value={day} max={dateKey()} onChange={(e) => setDay(e.target.value)} />
        </label>
      </div>
      <button className="btn primary block" type="submit" disabled={!valid}>
        Add entry
      </button>
    </form>
  );
}

export function CaloriesScreen() {
  const [items, setItems] = useCalories();
  const [goal, setGoal] = useCalorieGoal();
  const [adding, setAdding] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const today = dateKey();

  const todayItems = items.filter((x) => x.date === today);
  const todayTotal = sum(todayItems);
  const week = lastDays(7).map((d) => ({ label: weekdayLetter(d), value: sum(items.filter((x) => x.date === d)), highlight: d === today }));
  const avg = Math.round(week.reduce((s, d) => s + d.value, 0) / week.length);
  const recent = [...items].sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts).slice(0, 40);
  const left = goal - todayTotal;

  return (
    <Page
      meta={META.calories}
      actions={
        <>
          <button className="icon-btn" onClick={() => setEditingGoal(true)} aria-label="Calorie goal">
            <SlidersHorizontal size={20} />
          </button>
          <button className="icon-btn" onClick={() => setAdding(true)} aria-label="Add calories">
            <Plus />
          </button>
        </>
      }
    >
      <section className="card hero">
        <Ring value={todayTotal} max={goal} size={196} stroke={12}>
          <span className="hero-num">
            {todayTotal}
            <span className="unit">kcal</span>
          </span>
          <span className="muted small">Goal {goal}</span>
        </Ring>
        <p className="hero-note" style={left < 0 ? { color: 'var(--danger)' } : undefined}>
          {left >= 0 ? `${left} kcal left` : `${-left} kcal over`}
        </p>
      </section>

      <button className="btn primary block lg" onClick={() => setAdding(true)}>
        <Plus size={18} /> Add calories
      </button>

      <section className="card">
        <div className="stat-grid">
          <Stat label="Today" value={todayTotal} sub="kcal" />
          <Stat label="7-day avg" value={avg} sub="kcal" />
          <Stat label="Entries" value={todayItems.length} sub="today" />
        </div>
      </section>

      <SectionTitle>Last 7 days</SectionTitle>
      <section className="card">
        <Bars data={week} goal={goal} format={(v) => String(v)} />
      </section>

      <SectionTitle>Recent</SectionTitle>
      {recent.length === 0 ? (
        <Empty icon={META.calories.icon} title="No meals logged" text="Log meals and snacks to track your daily intake." />
      ) : (
        <ul className="card list">
          {recent.map((e) => {
            const Icon = mealIcon(e.meal);
            return (
              <li key={e.id} className="log-item">
                <span className="tile sm">
                  <Icon size={15} />
                </span>
                <span className="log-main">
                  <span>{e.note || MEALS.find((m) => m.id === e.meal)?.label}</span>
                  <span className="muted small">{relDay(e.date)}</span>
                </span>
                <span className="strong tabular">{e.kcal} kcal</span>
                <button className="icon-btn subtle" onClick={() => removeWithUndo(setItems, (x) => x.id === e.id, 'Entry deleted')} aria-label={`Delete ${e.kcal} calories`}>
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet color={META.calories.color} open={adding} onClose={() => setAdding(false)} title="Add calories">
        {adding && <AddCalories onDone={() => setAdding(false)} />}
      </Sheet>
      <Sheet color={META.calories.color} open={editingGoal} onClose={() => setEditingGoal(false)} title="Daily goal">
        <div className="stack">
          <div className="card form inset">
            <Stepper label="Calories" unit="kcal" value={goal} min={1000} max={6000} step={50} onChange={setGoal} />
          </div>
          <button className="btn primary block" onClick={() => setEditingGoal(false)}>
            Done
          </button>
        </div>
      </Sheet>
    </Page>
  );
}
