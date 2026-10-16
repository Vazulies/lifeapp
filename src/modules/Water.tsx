import { useState } from 'react';
import { Droplet, Plus, Trash2, Undo2 } from 'lucide-react';
import { setValue, useStore } from '../lib/store';
import { dateKey, fmtTime, lastDays, weekdayLetter } from '../lib/date';
import { useSettings } from '../lib/settings';
import { haptic, toast } from '../lib/feedback';
import { Bars, Page, Ring, SectionTitle, Sheet } from '../components/ui';
import { META } from './meta';

interface Drink {
  ml: number;
  ts: number;
}
type WaterLog = Record<string, Drink[]>;

const EMPTY: WaterLog = {};
const useWater = () => useStore<WaterLog>('water', EMPTY);
const total = (d: Drink[] = []) => d.reduce((s, x) => s + x.ml, 0);
const liters = (ml: number) => `${parseFloat((ml / 1000).toFixed(2))}L`;

function addWater(ml: number) {
  haptic();
  const key = dateKey();
  setValue<WaterLog>('water', EMPTY, (log) => ({ ...log, [key]: [...(log[key] ?? []), { ml, ts: Date.now() }] }));
}

function removeWater(key: string, index: number) {
  let removed: Drink | undefined;
  setValue<WaterLog>('water', EMPTY, (log) => {
    removed = log[key]?.[index];
    return removed ? { ...log, [key]: log[key].filter((_, i) => i !== index) } : log;
  });
  if (!removed) return;
  const d = removed;
  haptic();
  toast(`${d.ml} ml removed`, {
    label: 'Undo',
    run: () =>
      setValue<WaterLog>('water', EMPTY, (log) => {
        const list = [...(log[key] ?? [])];
        list.splice(Math.min(index, list.length), 0, d);
        return { ...log, [key]: list };
      }),
  });
}

export function WaterScreen() {
  const [log] = useWater();
  const [{ waterGoal }] = useSettings();
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState('300');
  const today = dateKey();
  const drinks = log[today] ?? [];
  const sum = total(drinks);
  const week = lastDays(7).map((d) => ({ label: weekdayLetter(d), value: total(log[d]), highlight: d === today }));
  const daysHit = lastDays(7).filter((d) => total(log[d]) >= waterGoal).length;

  return (
    <Page meta={META.water}>
      <section className="card hero">
        <Ring value={sum} max={waterGoal} size={208} stroke={14}>
          <span className="hero-num">
            {sum}
            <span className="unit">ml</span>
          </span>
          <span className="muted small">of {waterGoal} ml</span>
        </Ring>
        <p className="hero-note">{sum >= waterGoal ? 'Goal reached' : `${waterGoal - sum} ml to go`}</p>
      </section>

      <div className="quick-grid">
        {[150, 250, 500].map((ml) => (
          <button key={ml} className="btn tinted" onClick={() => addWater(ml)}>
            {ml} ml
          </button>
        ))}
        <button className="btn tinted" onClick={() => setCustomOpen(true)} aria-label="Custom amount">
          <Plus size={18} />
        </button>
      </div>
      {drinks.length > 0 && (
        <button className="btn ghost block" onClick={() => removeWater(today, drinks.length - 1)}>
          <Undo2 size={17} /> Undo last
        </button>
      )}

      <SectionTitle>Last 7 days</SectionTitle>
      <section className="card">
        <Bars data={week} goal={waterGoal} format={liters} />
        <p className="muted small center">Goal reached {daysHit} of 7 days</p>
      </section>

      {drinks.length > 0 && (
        <>
          <SectionTitle>Today</SectionTitle>
          <ul className="card list">
            {drinks
              .map((d, i) => ({ ...d, i }))
              .reverse()
              .map((d) => (
                <li key={d.ts + '-' + d.i} className="log-item">
                  <span className="tile sm">
                    <Droplet size={15} />
                  </span>
                  <span className="log-main">{d.ml} ml</span>
                  <span className="muted small tabular">{fmtTime(d.ts)}</span>
                  <button className="icon-btn subtle" onClick={() => removeWater(today, d.i)} aria-label={`Remove ${d.ml} ml`}>
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
          </ul>
        </>
      )}

      <Sheet color={META.water.color} open={customOpen} onClose={() => setCustomOpen(false)} title="Add water">
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            const ml = Math.round(Number(custom));
            if (ml > 0 && ml <= 5000) {
              addWater(ml);
              setCustomOpen(false);
            }
          }}
        >
          <label className="field">
            <span>Amount in ml</span>
            <input type="number" inputMode="numeric" min={1} max={5000} value={custom} onChange={(e) => setCustom(e.target.value)} autoFocus />
          </label>
          <button className="btn primary block" type="submit" disabled={!(Number(custom) > 0 && Number(custom) <= 5000)}>
            Add
          </button>
        </form>
      </Sheet>
    </Page>
  );
}
