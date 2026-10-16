import { useState } from 'react';
import { ChevronRight, Coffee, Plus, Star, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { dateKey, fmtHM, fmtTime, lastDays, relDay, spanMinutes, weekdayLetter } from '../lib/date';
import { uid } from '../lib/id';
import { useNow } from '../lib/hooks';
import { navigate } from '../lib/router';
import { useSettings } from '../lib/settings';
import { haptic, removeWithUndo } from '../lib/feedback';
import { accent, Bars, Empty, Page, SectionTitle, Sheet, Stat } from '../components/ui';
import { META } from './meta';
import { clearsAt, useDoses } from './caffeine-model';

interface SleepEntry {
  id: string;
  /** Day you woke up. */
  date: string;
  bed: string;
  wake: string;
  quality: number;
}

const EMPTY: SleepEntry[] = [];
const useSleep = () => useStore<SleepEntry[]>('sleep', EMPTY);

const minutesOf = (e: SleepEntry) => spanMinutes(e.bed, e.wake);
const QUALITY = ['', 'Terrible', 'Poor', 'Okay', 'Good', 'Great'];

function Stars({ value, onChange, size = 16 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  if (onChange) {
    return (
      <span className="stars" role="radiogroup" aria-label="Sleep quality">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            className={`star${n <= value ? ' on' : ''}`}
            onClick={() => {
              haptic(6);
              onChange(n);
            }}
            role="radio"
            aria-checked={n === value}
            aria-label={QUALITY[n]}
          >
            <Star size={size} />
          </button>
        ))}
      </span>
    );
  }
  return (
    <span className="stars" role="img" aria-label={`Quality ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={`star${n <= value ? ' on' : ''}`} />
      ))}
    </span>
  );
}

function SleepForm({ initial, onDone }: { initial: SleepEntry; onDone: () => void }) {
  const [, setEntries] = useSleep();
  const [e, setE] = useState(initial);
  const valid = !!e.date && !!e.bed && !!e.wake && e.date <= dateKey() && e.quality > 0;
  return (
    <form
      className="stack"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (!valid) return;
        haptic();
        // One entry per wake-up day: replace any existing one.
        setEntries((es) => [...es.filter((x) => x.date !== e.date && x.id !== e.id), e].sort((a, b) => (a.date < b.date ? 1 : -1)));
        onDone();
      }}
    >
      <label className="field">
        <span>Woke up on</span>
        <input type="date" value={e.date} max={dateKey()} onChange={(ev) => setE({ ...e, date: ev.target.value })} />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Bedtime</span>
          <input type="time" value={e.bed} onChange={(ev) => setE({ ...e, bed: ev.target.value })} />
        </label>
        <label className="field">
          <span>Wake time</span>
          <input type="time" value={e.wake} onChange={(ev) => setE({ ...e, wake: ev.target.value })} />
        </label>
      </div>
      {e.bed && e.wake && <p className="center strong tabular">{fmtHM(spanMinutes(e.bed, e.wake))} of sleep</p>}
      <div className="field">
        <span>Quality{e.quality > 0 && ` · ${QUALITY[e.quality]}`}</span>
        <Stars value={e.quality} onChange={(quality) => setE({ ...e, quality })} size={28} />
      </div>
      <button className="btn primary block" type="submit" disabled={!valid}>
        Save
      </button>
    </form>
  );
}

export function SleepScreen() {
  const [entries, setEntries] = useSleep();
  const [doses] = useDoses();
  const [{ sleepGoal }] = useSettings();
  const now = useNow(60_000);
  const [form, setForm] = useState<SleepEntry | null>(null);
  const today = dateKey();
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const days = lastDays(7);
  const recent = days.map((d) => byDate.get(d)).filter((e): e is SleepEntry => !!e);
  const avgMin = recent.length ? recent.reduce((s, e) => s + minutesOf(e), 0) / recent.length : 0;
  const avgQ = recent.length ? recent.reduce((s, e) => s + e.quality, 0) / recent.length : 0;
  const debt = recent.reduce((s, e) => s + (sleepGoal * 60 - minutesOf(e)), 0);
  const last = entries[0];
  const caffeineClear = clearsAt(doses, now);

  const newEntry = (): SleepEntry => ({ id: uid(), date: today, bed: last?.bed ?? '23:00', wake: last?.wake ?? '07:00', quality: 0 });

  return (
    <Page
      meta={META.sleep}
      actions={
        <button className="icon-btn" onClick={() => setForm(newEntry())} aria-label="Log sleep">
          <Plus />
        </button>
      }
    >
      {caffeineClear && (
        <button className="callout" style={accent(META.caffeine.color)} onClick={() => navigate('/m/caffeine')}>
          <Coffee size={17} />
          <span>
            Caffeine stays above sleep-safe levels until <strong>{fmtTime(caffeineClear)}</strong>
          </span>
          <ChevronRight size={16} />
        </button>
      )}

      {!last ? (
        <Empty
          icon={META.sleep.icon}
          title="No sleep logged"
          text="Log when you went to bed and woke up to see your patterns."
          action={
            <button className="btn primary" onClick={() => setForm(newEntry())}>
              Log last night
            </button>
          }
        />
      ) : (
        <>
          <section className="card hero">
            <span className="eyebrow">{last.date === today ? 'Last night' : relDay(last.date)}</span>
            <span className="hero-num xl">{fmtHM(minutesOf(last))}</span>
            <span className="muted tabular">
              {last.bed} – {last.wake}
            </span>
            <Stars value={last.quality} size={18} />
            {last.date !== today && (
              <button className="btn tinted" onClick={() => setForm(newEntry())}>
                Log last night
              </button>
            )}
          </section>

          <SectionTitle>Last 7 nights</SectionTitle>
          <section className="card">
            <Bars
              data={days.map((d) => ({ label: weekdayLetter(d), value: byDate.has(d) ? minutesOf(byDate.get(d)!) / 60 : 0, highlight: d === today }))}
              goal={sleepGoal}
              format={(v) => v.toFixed(1)}
            />
            <div className="stat-grid">
              <Stat label="Average" value={recent.length ? fmtHM(avgMin) : '–'} sub={`Goal ${sleepGoal}h`} />
              <Stat label="Quality" value={avgQ ? avgQ.toFixed(1) : '–'} sub="out of 5" />
              <Stat label={debt >= 0 ? 'Sleep debt' : 'Surplus'} value={recent.length ? fmtHM(Math.abs(debt)) : '–'} sub="this week" />
            </div>
          </section>

          <SectionTitle>History</SectionTitle>
          <ul className="card list">
            {entries.slice(0, 30).map((e) => (
              <li key={e.id} className="log-item">
                <button className="log-main log-button" onClick={() => setForm(e)} aria-label={`Edit ${relDay(e.date)}`}>
                  <strong>{relDay(e.date)}</strong>
                  <span className="muted small tabular">
                    {e.bed} – {e.wake}
                  </span>
                </button>
                <span className="log-side">
                  <span className="strong tabular">{fmtHM(minutesOf(e))}</span>
                  <Stars value={e.quality} size={10} />
                </span>
                <button className="icon-btn subtle" onClick={() => removeWithUndo(setEntries, (x) => x.id === e.id, 'Entry deleted')} aria-label={`Delete ${relDay(e.date)}`}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Sheet color={META.sleep.color} open={!!form} onClose={() => setForm(null)} title="Log sleep">
        {form && <SleepForm key={form.id} initial={form} onDone={() => setForm(null)} />}
      </Sheet>
    </Page>
  );
}
