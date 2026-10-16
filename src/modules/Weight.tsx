import { useState } from 'react';
import { SlidersHorizontal, Trash2 } from 'lucide-react';
import { setValue, useStore } from '../lib/store';
import { addDays, dateKey, fmtDate, relDay } from '../lib/date';
import { useSettings, type Settings } from '../lib/settings';
import { haptic, toast } from '../lib/feedback';
import { Empty, Page, SectionTitle, Segmented, Sheet, Stat } from '../components/ui';
import { META } from './meta';

/** Day key → weight in kg. */
type WeightLog = Record<string, number>;

const EMPTY: WeightLog = {};
const useWeights = () => useStore<WeightLog>('weight', EMPTY);
const LB = 2.20462;

const toUnit = (kg: number, unit: Settings['weightUnit']) => (unit === 'lb' ? kg * LB : kg);
const fromUnit = (v: number, unit: Settings['weightUnit']) => (unit === 'lb' ? v / LB : v);
const fmtW = (kg: number, unit: Settings['weightUnit']) => toUnit(kg, unit).toFixed(1);
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}`;

const sortedEntries = (log: WeightLog) => Object.entries(log).sort(([a], [b]) => (a < b ? -1 : 1));

/** Baseline for "change over the last N days": the latest entry on or before `day`, else the earliest one after it. */
function baseline(entries: [string, number][], day: string) {
  for (let i = entries.length - 1; i >= 0; i--) if (entries[i][0] <= day) return entries[i];
  return entries[0];
}

function Chart({ entries, unit, goal }: { entries: [string, number][]; unit: Settings['weightUnit']; goal: number }) {
  const pts = entries.slice(-30).map(([d, kg]) => [d, toUnit(kg, unit)] as const);
  if (pts.length < 2) return <p className="muted small center chart-empty">Log at least two days to see your trend.</p>;
  const values = pts.map((p) => p[1]);
  const g = goal ? toUnit(goal, unit) : null;
  let min = Math.min(...values, ...(g ? [g] : []));
  let max = Math.max(...values, ...(g ? [g] : []));
  if (max - min < 2) {
    min -= 1;
    max += 1;
  }
  const W = 300;
  const H = 120;
  const P = 8;
  const x = (i: number) => P + (i / (pts.length - 1)) * (W - 2 * P);
  const y = (v: number) => P + (1 - (v - min) / (max - min)) * (H - 2 * P);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[1]).toFixed(1)}`).join('');
  return (
    <div className="weight-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Weight trend over the last ${pts.length} entries`}>
        {g !== null && <line x1={P} x2={W - P} y1={y(g)} y2={y(g)} stroke="var(--faint)" strokeDasharray="3 4" />}
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={p[0]} cx={x(i)} cy={y(p[1])} r={i === pts.length - 1 ? 4 : 2.5} fill={i === pts.length - 1 ? 'var(--accent)' : 'var(--surface-strong)'} stroke="var(--accent)" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="curve-labels">
        <span>{fmtDate(pts[0][0])}</span>
        <span>{fmtDate(pts[pts.length - 1][0])}</span>
      </div>
    </div>
  );
}

function SettingsForm({ onDone }: { onDone: () => void }) {
  const [s, update] = useSettings();
  const [unit, setUnit] = useState(s.weightUnit);
  const [goal, setGoal] = useState(s.weightGoal ? fmtW(s.weightGoal, s.weightUnit) : '');
  const g = goal.trim() ? Number(goal.replace(',', '.')) : 0;
  const valid = Number.isFinite(g) && g >= 0 && g < 1000;
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        haptic();
        update({ weightUnit: unit, weightGoal: g ? Math.round(fromUnit(g, unit) * 100) / 100 : 0 });
        onDone();
      }}
    >
      <div className="field">
        <span>Unit</span>
        <Segmented
          label="Unit"
          value={unit}
          onChange={(u) => {
            // Keep the typed goal meaning the same weight when switching units.
            if (g) setGoal(toUnit(fromUnit(g, unit), u).toFixed(1));
            setUnit(u);
          }}
          options={[
            { value: 'kg', label: 'Kilograms' },
            { value: 'lb', label: 'Pounds' },
          ]}
        />
      </div>
      <label className="field">
        <span>Goal weight ({unit})</span>
        <input value={goal} onChange={(e) => setGoal(e.target.value)} inputMode="decimal" placeholder="No goal" />
      </label>
      <button className="btn primary block" type="submit" disabled={!valid}>
        Save
      </button>
    </form>
  );
}

export function WeightScreen() {
  const [log, setLog] = useWeights();
  const [{ weightUnit: unit, weightGoal }] = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const today = dateKey();
  const entries = sortedEntries(log);
  const latest = entries[entries.length - 1];
  const [value, setValueText] = useState(log[today] ? fmtW(log[today], unit) : latest ? fmtW(latest[1], unit) : '');
  const v = Number(value.replace(',', '.'));
  const valid = v > 0 && v < 1000;
  const change = (days: number) => {
    const past = baseline(entries, dateKey(addDays(new Date(), -days)));
    return latest && past && past[0] !== latest[0] ? toUnit(latest[1] - past[1], unit) : null;
  };
  const week = change(7);
  const month = change(30);

  const remove = (day: string) => {
    const kg = log[day];
    setLog((l) => {
      const next = { ...l };
      delete next[day];
      return next;
    });
    haptic();
    toast('Entry deleted', { label: 'Undo', run: () => setValue<WeightLog>('weight', EMPTY, (l) => ({ ...l, [day]: kg })) });
  };

  return (
    <Page
      meta={META.weight}
      actions={
        <button className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Unit and goal">
          <SlidersHorizontal size={20} />
        </button>
      }
    >
      <form
        className="card weigh-in"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          haptic([8, 40, 8]);
          setLog((l) => ({ ...l, [today]: Math.round(fromUnit(v, unit) * 100) / 100 }));
          toast(log[today] ? 'Today updated' : 'Weigh-in saved');
        }}
      >
        <label className="amount-field">
          <span className="muted small">{log[today] ? 'Today' : "Today's weigh-in"}</span>
          <span className="weigh-row">
            <span className="autosize" data-value={value || '0.0'}>
              <input size={1} value={value} onChange={(e) => setValueText(e.target.value)} inputMode="decimal" placeholder="0.0" aria-label={`Weight in ${unit}`} />
            </span>
            <span className="weigh-unit">{unit}</span>
          </span>
        </label>
        <button className="btn primary" type="submit" disabled={!valid}>
          {log[today] ? 'Update' : 'Save'}
        </button>
      </form>

      {!latest ? (
        <Empty icon={META.weight.icon} title="No weigh-ins yet" text="Weigh yourself at the same time each day for the clearest trend." />
      ) : (
        <>
          <section className="card">
            <Chart entries={entries} unit={unit} goal={weightGoal} />
            <div className="stat-grid">
              <Stat label="7 days" value={week === null ? '–' : signed(week)} sub={unit} />
              <Stat label="30 days" value={month === null ? '–' : signed(month)} sub={unit} />
              {weightGoal > 0 && <Stat label="To goal" value={Math.abs(toUnit(latest[1] - weightGoal, unit)).toFixed(1)} sub={unit} />}
            </div>
          </section>

          <SectionTitle>History</SectionTitle>
          <ul className="card list">
            {[...entries]
              .reverse()
              .slice(0, 30)
              .map(([d, kg]) => (
                <li key={d} className="log-item">
                  <span className="log-main">{relDay(d)}</span>
                  <span className="strong tabular">
                    {fmtW(kg, unit)} <span className="muted small">{unit}</span>
                  </span>
                  <button className="icon-btn subtle" onClick={() => remove(d)} aria-label={`Delete ${relDay(d)}`}>
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
          </ul>
        </>
      )}

      <Sheet color={META.weight.color} open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Unit and goal">
        {settingsOpen && <SettingsForm onDone={() => setSettingsOpen(false)} />}
      </Sheet>
    </Page>
  );
}
