import type { CSSProperties } from 'react';
import { Angry, Annoyed, Laugh, Meh, Smile, type LucideIcon } from 'lucide-react';
import { useStore } from '../lib/store';
import { dateKey, lastDays, parseKey, relDay, weekdayLetter } from '../lib/date';
import { haptic } from '../lib/feedback';
import { local, Page, SectionTitle, Stat } from '../components/ui';
import { META } from './meta';

interface MoodEntry {
  mood: number;
  note: string;
  ts: number;
}
type MoodLog = Record<string, MoodEntry>;

const EMPTY: MoodLog = {};
const useMood = () => useStore<MoodLog>('mood', EMPTY);

const MOODS: { v: number; icon: LucideIcon; label: string; color: string }[] = [
  { v: 1, icon: Angry, label: 'Awful', color: '#DD4545' },
  { v: 2, icon: Annoyed, label: 'Bad', color: '#E5672E' },
  { v: 3, icon: Meh, label: 'Okay', color: '#D49A06' },
  { v: 4, icon: Smile, label: 'Good', color: '#76A83A' },
  { v: 5, icon: Laugh, label: 'Great', color: '#2F9A5A' },
];
const moodOf = (v: number) => MOODS[Math.min(5, Math.max(1, Math.round(v))) - 1];

const setToday = (log: MoodLog, mood: number): MoodLog => {
  const key = dateKey();
  return { ...log, [key]: { note: log[key]?.note ?? '', mood, ts: Date.now() } };
};

function Picker({ value, onPick, compact }: { value?: number; onPick: (v: number) => void; compact?: boolean }) {
  return (
    <div className={`mood-picker${compact ? ' compact' : ''}`} role="radiogroup" aria-label="Mood">
      {MOODS.map((m) => {
        const on = value === m.v;
        return (
          <button
            key={m.v}
            className={`mood-btn${on ? ' on' : ''}${value && !on ? ' dim' : ''}`}
            style={{ '--mood': m.color } as CSSProperties}
            onClick={local(() => {
              haptic(8);
              onPick(m.v);
            })}
            role="radio"
            aria-checked={on}
            aria-label={m.label}
          >
            <m.icon size={compact ? 22 : 26} />
            {!compact && <span className="mood-label">{m.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function MoodScreen() {
  const [log, setLog] = useMood();
  const today = dateKey();
  const entry = log[today];
  const days = lastDays(35);
  const month = lastDays(30)
    .map((d) => log[d])
    .filter(Boolean);
  const avg = month.length ? month.reduce((s, e) => s + e.mood, 0) / month.length : 0;
  // Not checking in yet today shouldn't break a streak that ran through yesterday.
  let streak = 0;
  for (let i = days.length - (entry ? 1 : 2); i >= 0 && log[days[i]]; i--) streak++;
  const history = Object.entries(log)
    .filter(([d]) => d !== today)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 30);
  const AvgIcon = avg ? moodOf(avg).icon : null;

  return (
    <Page meta={META.mood}>
      <section className="card stack">
        <h2 className="card-title">How are you feeling today?</h2>
        <Picker value={entry?.mood} onPick={(v) => setLog((l) => setToday(l, v))} />
        {entry && (
          <textarea
            className="note-input"
            rows={3}
            value={entry.note}
            onChange={(e) => setLog((l) => ({ ...l, [today]: { ...l[today], note: e.target.value } }))}
            placeholder="Add a note (optional)"
            aria-label="Mood note"
          />
        )}
      </section>

      <SectionTitle>Last 5 weeks</SectionTitle>
      <section className="card">
        <div className="heatmap">
          {days.slice(0, 7).map((d) => (
            <span key={'h' + d} className="heat-head">
              {weekdayLetter(d)}
            </span>
          ))}
          {days.map((d) => {
            const e = log[d];
            return (
              <span
                key={d}
                className={`heat-cell${e ? ' filled' : ''}${d === today ? ' today' : ''}`}
                style={e ? { background: moodOf(e.mood).color } : undefined}
                title={`${relDay(d)}${e ? ': ' + moodOf(e.mood).label : ''}`}
              >
                {parseKey(d).getDate()}
              </span>
            );
          })}
        </div>
        <div className="stat-grid">
          <Stat
            label="30-day average"
            value={
              AvgIcon ? (
                <span className="inline-icon">
                  <AvgIcon size={18} /> {avg.toFixed(1)}
                </span>
              ) : (
                '–'
              )
            }
          />
          <Stat label="Check-in streak" value={`${streak} day${streak === 1 ? '' : 's'}`} />
        </div>
      </section>

      {history.length > 0 && (
        <>
          <SectionTitle>Journal</SectionTitle>
          <ul className="card list">
            {history.map(([d, e]) => {
              const m = moodOf(e.mood);
              return (
                <li key={d} className="log-item top">
                  <span className="tile sm" style={{ color: m.color }}>
                    <m.icon size={16} />
                  </span>
                  <span className="log-main">
                    <strong>
                      {relDay(d)} <span className="muted small">· {m.label}</span>
                    </strong>
                    {e.note && <span className="muted small pre">{e.note}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Page>
  );
}
