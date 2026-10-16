import { useState } from 'react';
import { Coffee, CupSoda, FlaskConical, Leaf, Milk, Plus, Snowflake, Sprout, Trash2, Zap, type LucideIcon } from 'lucide-react';
import { dateKey, fmtTime, HOUR, lastDays, MIN, nowHM, weekdayLetter } from '../lib/date';
import { uid } from '../lib/id';
import { useNow } from '../lib/hooks';
import { useSettings } from '../lib/settings';
import { haptic, removeWithUndo, toast } from '../lib/feedback';
import { Bars, Page, SectionTitle, Sheet } from '../components/ui';
import { META } from './meta';
import { clearsAt, levelAt, SLEEP_SAFE_MG, useDoses, type Dose } from './caffeine-model';

const ICONS: Record<string, LucideIcon> = {
  coffee: Coffee,
  milk: Milk,
  ice: Snowflake,
  leaf: Leaf,
  sprout: Sprout,
  zap: Zap,
  soda: CupSoda,
  custom: FlaskConical,
};
const iconOf = (d: Pick<Dose, 'icon'>) => ICONS[d.icon ?? ''] ?? Coffee;

const PRESETS = [
  { label: 'Espresso', icon: 'coffee', mg: 63 },
  { label: 'Coffee', icon: 'coffee', mg: 95 },
  { label: 'Latte', icon: 'milk', mg: 75 },
  { label: 'Cold brew', icon: 'ice', mg: 155 },
  { label: 'Black tea', icon: 'leaf', mg: 47 },
  { label: 'Green tea', icon: 'sprout', mg: 28 },
  { label: 'Energy drink', icon: 'zap', mg: 80 },
  { label: 'Cola', icon: 'soda', mg: 34 },
];

const dayTotal = (doses: Dose[], key: string) => doses.filter((d) => dateKey(d.ts) === key).reduce((s, d) => s + d.mg, 0);

function Curve({ doses, now }: { doses: Dose[]; now: number }) {
  const start = now - 6 * HOUR;
  const end = now + 12 * HOUR;
  const pts: [number, number][] = [];
  for (let t = start; t <= end; t += 10 * MIN) pts.push([t, levelAt(doses, t)]);
  const max = Math.max(150, ...pts.map((p) => p[1])) * 1.15;
  const x = (t: number) => ((t - start) / (end - start)) * 300;
  const y = (mg: number) => 100 - (mg / max) * 100;
  const line = pts.map(([t, mg], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(mg).toFixed(1)}`).join('');
  return (
    <div className="curve">
      <svg viewBox="0 0 300 100" preserveAspectRatio="none" role="img" aria-label="Estimated caffeine level from six hours ago to twelve hours ahead">
        <path d={`${line}L300,100L0,100Z`} fill="var(--accent)" fillOpacity="0.1" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <line x1="0" x2="300" y1={y(SLEEP_SAFE_MG)} y2={y(SLEEP_SAFE_MG)} stroke="var(--muted)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        <line x1={x(now)} x2={x(now)} y1="0" y2="100" stroke="var(--text)" strokeOpacity="0.3" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="curve-labels">
        <span>{fmtTime(start)}</span>
        <span className="strong">Now</span>
        <span>{fmtTime(now + 6 * HOUR)}</span>
        <span>{fmtTime(end)}</span>
      </div>
      <p className="muted tiny">Dashed line marks {SLEEP_SAFE_MG} mg, roughly where caffeine stops disturbing sleep.</p>
    </div>
  );
}

function CustomForm({ onDone }: { onDone: () => void }) {
  const [, setDoses] = useDoses();
  const [label, setLabel] = useState('');
  const [mg, setMg] = useState('100');
  const [time, setTime] = useState(nowHM());
  const valid = Number(mg) > 0 && Number(mg) <= 1000 && /^\d\d:\d\d$/.test(time);

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        const [h, m] = time.split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        // A time later than now most likely means last night.
        const ts = d.getTime() > Date.now() + MIN ? d.getTime() - 24 * HOUR : d.getTime();
        haptic();
        setDoses((ds) => [...ds, { id: uid(), ts, mg: Math.round(Number(mg)), label: label.trim() || 'Custom', icon: 'custom' }]);
        onDone();
      }}
    >
      <label className="field">
        <span>Drink</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Double shot" />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Caffeine (mg)</span>
          <input type="number" inputMode="numeric" min={1} max={1000} value={mg} onChange={(e) => setMg(e.target.value)} />
        </label>
        <label className="field">
          <span>Time</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <button className="btn primary block" type="submit" disabled={!valid}>
        Log drink
      </button>
    </form>
  );
}

export function CaffeineScreen() {
  const [doses, setDoses] = useDoses();
  const [{ caffeineLimit }] = useSettings();
  const now = useNow(30_000);
  const [customOpen, setCustomOpen] = useState(false);
  const today = dateKey(now);
  const level = levelAt(doses, now);
  const clear = clearsAt(doses, now);
  const todayTotal = dayTotal(doses, today);
  const todayDoses = doses.filter((d) => dateKey(d.ts) === today).sort((a, b) => b.ts - a.ts);
  const pct = Math.min(100, (todayTotal / caffeineLimit) * 100);
  const week = lastDays(7, new Date(now)).map((d) => ({ label: weekdayLetter(d), value: dayTotal(doses, d), highlight: d === today }));

  const log = (p: (typeof PRESETS)[number]) => {
    haptic();
    setDoses((ds) => [...ds, { id: uid(), ts: Date.now(), ...p }]);
    toast(`${p.label} logged · ${p.mg} mg`);
  };

  return (
    <Page meta={META.caffeine}>
      <section className="card hero">
        <span className="eyebrow">In your system</span>
        <span className="hero-num xl">
          {Math.round(level)}
          <span className="unit">mg</span>
        </span>
        <p className="hero-note">{clear ? `Below ${SLEEP_SAFE_MG} mg at ${fmtTime(clear)}` : level > 1 ? 'Low enough for sleep' : 'Caffeine-free'}</p>
        <Curve doses={doses} now={now} />
      </section>

      <section className="card">
        <div className="meter-head">
          <span>
            <strong className="tabular">{todayTotal} mg</strong> <span className="muted">today</span>
          </span>
          <span className="muted small">Limit {caffeineLimit} mg</span>
        </div>
        <div className="meter" role="progressbar" aria-valuenow={todayTotal} aria-valuemax={caffeineLimit} aria-label="Caffeine today">
          <div className={`meter-fill${todayTotal > caffeineLimit ? ' over' : ''}`} style={{ width: `${pct}%` }} />
        </div>
        {todayTotal > caffeineLimit && <p className="warn small">{todayTotal - caffeineLimit} mg over your daily limit.</p>}
      </section>

      <SectionTitle>Log a drink</SectionTitle>
      <div className="preset-grid">
        {PRESETS.map((p) => {
          const Icon = iconOf(p);
          return (
            <button key={p.label} className="preset" onClick={() => log(p)}>
              <Icon size={20} />
              <span className="preset-name">{p.label}</span>
              <span className="muted tiny">{p.mg} mg</span>
            </button>
          );
        })}
        <button className="preset" onClick={() => setCustomOpen(true)}>
          <Plus size={20} />
          <span className="preset-name">Custom</span>
          <span className="muted tiny">Any amount</span>
        </button>
      </div>

      {todayDoses.length > 0 && (
        <>
          <SectionTitle>Today</SectionTitle>
          <ul className="card list">
            {todayDoses.map((d) => {
              const Icon = iconOf(d);
              return (
                <li key={d.id} className="log-item">
                  <span className="tile sm">
                    <Icon size={15} />
                  </span>
                  <span className="log-main">
                    {d.label} <span className="muted small">· {d.mg} mg</span>
                  </span>
                  <span className="muted small tabular">{fmtTime(d.ts)}</span>
                  <button className="icon-btn subtle" onClick={() => removeWithUndo(setDoses, (x) => x.id === d.id, `${d.label} removed`)} aria-label={`Remove ${d.label}`}>
                    <Trash2 size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <SectionTitle>Last 7 days</SectionTitle>
      <section className="card">
        <Bars data={week} goal={caffeineLimit} format={(v) => String(v)} />
      </section>

      <p className="footnote">Estimates assume a 5-hour half-life. Real metabolism varies with genetics, medication, pregnancy and more.</p>

      <Sheet color={META.caffeine.color} open={customOpen} onClose={() => setCustomOpen(false)} title="Log caffeine">
        {customOpen && <CustomForm onDone={() => setCustomOpen(false)} />}
      </Sheet>
    </Page>
  );
}
