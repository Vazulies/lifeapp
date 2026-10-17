import { useState } from 'react';
import { Footprints, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { dateKey, lastDays, relDay, weekdayLetter } from '../lib/date';
import { uid } from '../lib/id';
import { haptic, removeWithUndo } from '../lib/feedback';
import { Bars, Empty, Page, Ring, SectionTitle, Sheet, Stepper } from '../components/ui';
import { META } from './meta';

interface StepLog {
  id: string;
  date: string;
  ts: number;
  steps: number;
}

const EMPTY: StepLog[] = [];
const useSteps = () => useStore<StepLog[]>('steps', EMPTY);
const useGoal = () => useStore<number>('steps-goal', 8000);

const sum = (logs: StepLog[]) => logs.reduce((s, x) => s + x.steps, 0);

function AddSteps({ onDone }: { onDone: () => void }) {
  const [, setLogs] = useSteps();
  const [date, setDate] = useState(dateKey());
  const [steps, setSteps] = useState('2500');
  const n = Math.round(Number(steps));
  const valid = n > 0 && n <= 100_000 && !!date && date <= dateKey();
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        haptic();
        setLogs((xs) => [...xs, { id: uid(), date, ts: Date.now(), steps: n }]);
        onDone();
      }}
    >
      <label className="field">
        <span>Steps</span>
        <input value={steps} onChange={(e) => setSteps(e.target.value)} inputMode="numeric" autoFocus />
      </label>
      <label className="field">
        <span>Date</span>
        <input type="date" value={date} max={dateKey()} onChange={(e) => setDate(e.target.value)} />
      </label>
      <button className="btn primary block" type="submit" disabled={!valid}>
        Add steps
      </button>
    </form>
  );
}

export function StepsScreen() {
  const [logs, setLogs] = useSteps();
  const [goal, setGoal] = useGoal();
  const [adding, setAdding] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const today = dateKey();
  const todayTotal = sum(logs.filter((x) => x.date === today));
  const week = lastDays(7).map((d) => ({ label: weekdayLetter(d), value: sum(logs.filter((x) => x.date === d)), highlight: d === today }));
  const hit = week.filter((d) => d.value >= goal).length;
  const recent = [...logs].sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts).slice(0, 30);

  return (
    <Page
      meta={META.steps}
      actions={
        <button className="icon-btn" onClick={() => setGoalOpen(true)} aria-label="Step goal">
          <Footprints size={20} />
        </button>
      }
    >
      <section className="card hero">
        <Ring value={todayTotal} max={goal} size={196} stroke={12}>
          <span className="hero-num">{todayTotal.toLocaleString()}</span>
          <span className="muted small">of {goal.toLocaleString()}</span>
        </Ring>
        <p className="hero-note">{todayTotal >= goal ? 'Goal reached' : `${(goal - todayTotal).toLocaleString()} to go`}</p>
      </section>

      <button className="btn primary block lg" onClick={() => setAdding(true)}>
        <Plus size={18} /> Log steps
      </button>

      <SectionTitle>Last 7 days</SectionTitle>
      <section className="card">
        <Bars data={week} goal={goal} format={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
        <p className="muted small center">Goal reached {hit} of 7 days</p>
      </section>

      <SectionTitle>Recent</SectionTitle>
      {recent.length === 0 ? (
        <Empty icon={META.steps.icon} title="No steps logged" text="Add your daily steps to track consistency." />
      ) : (
        <ul className="card list">
          {recent.map((x) => (
            <li key={x.id} className="log-item">
              <span className="tile sm">
                <Footprints size={15} />
              </span>
              <span className="log-main">
                <span>{x.steps.toLocaleString()} steps</span>
                <span className="muted small">{relDay(x.date)}</span>
              </span>
              <button className="icon-btn subtle" onClick={() => removeWithUndo(setLogs, (d) => d.id === x.id, 'Entry deleted')} aria-label={`Delete ${x.steps} steps`}>
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet color={META.steps.color} open={adding} onClose={() => setAdding(false)} title="Log steps">
        {adding && <AddSteps onDone={() => setAdding(false)} />}
      </Sheet>
      <Sheet color={META.steps.color} open={goalOpen} onClose={() => setGoalOpen(false)} title="Daily goal">
        <div className="stack">
          <div className="card form inset">
            <Stepper label="Steps" unit="" value={goal} min={1000} max={30000} step={500} onChange={setGoal} />
          </div>
          <button className="btn primary block" onClick={() => setGoalOpen(false)}>
            Done
          </button>
        </div>
      </Sheet>
    </Page>
  );
}
