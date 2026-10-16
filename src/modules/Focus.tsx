import { useEffect } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { getValue, setValue, useStore } from '../lib/store';
import { dateKey, fmtHM, lastDays, pad, weekdayLetter } from '../lib/date';
import { uid } from '../lib/id';
import { useNow } from '../lib/hooks';
import { askNotificationPermission, notify } from '../lib/notify';
import { ask, haptic } from '../lib/feedback';
import { Bars, Page, Ring, SectionTitle, Segmented, Stat } from '../components/ui';
import { META } from './meta';

type Mode = 'focus' | 'short' | 'long';

interface FocusState {
  mode: Mode;
  /** Timestamp the running timer ends at; null while paused. */
  endAt: number | null;
  /** Milliseconds left while paused. */
  remaining: number;
  label: string;
  /** Focus sessions finished in the current set of four. */
  cycle: number;
}

interface Session {
  id: string;
  ts: number;
  minutes: number;
  label: string;
}

const MINUTES: Record<Mode, number> = { focus: 25, short: 5, long: 15 };
const MODE_LABEL: Record<Mode, string> = { focus: 'Focus', short: 'Short break', long: 'Long break' };
const BREAK_COLOR = '#2F9A5A';
const INITIAL: FocusState = { mode: 'focus', endAt: null, remaining: MINUTES.focus * 60_000, label: '', cycle: 0 };
const NO_SESSIONS: Session[] = [];

const useFocus = () => useStore<FocusState>('focus', INITIAL);
const useSessions = () => useStore<Session[]>('focus-sessions', NO_SESSIONS);
const update = (fn: (s: FocusState) => FocusState) => setValue('focus', INITIAL, fn);

const remainingMs = (s: FocusState, now: number) => (s.endAt ? Math.max(0, s.endAt - now) : s.remaining);
const mmss = (ms: number) => {
  const sec = Math.ceil(ms / 1000);
  return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
};

function start() {
  haptic();
  void askNotificationPermission();
  update((s) => (s.endAt ? s : { ...s, endAt: Date.now() + s.remaining }));
}

function pause() {
  haptic();
  update((s) => (s.endAt ? { ...s, endAt: null, remaining: Math.max(0, s.endAt - Date.now()) } : s));
}

function reset(mode?: Mode) {
  update((s) => {
    const m = mode ?? s.mode;
    return { ...s, mode: m, endAt: null, remaining: MINUTES[m] * 60_000 };
  });
}

/** Move to the next phase. Logs and notifies only when the timer actually ran out. */
function advance(skip: boolean) {
  const s = getValue('focus', INITIAL);
  const finished = !!s.endAt && Date.now() >= s.endAt;
  if (!skip && !finished) return;
  let cycle = s.cycle;
  let next: Mode;
  if (s.mode === 'focus') {
    if (finished) {
      setValue<Session[]>('focus-sessions', NO_SESSIONS, (ss) => [...ss, { id: uid(), ts: Date.now(), minutes: MINUTES.focus, label: s.label }]);
      void notify('Focus session complete', 'Nice work. Time for a break.');
    }
    cycle += 1;
    next = cycle % 4 === 0 ? 'long' : 'short';
  } else {
    if (finished) void notify('Break is over', 'Ready for another focus session?');
    next = 'focus';
  }
  update((st) => ({ ...st, mode: next, endAt: null, remaining: MINUTES[next] * 60_000, cycle }));
}

/** Runs app-wide so a session completes even while you're on another screen. */
export function FocusEngine() {
  const [s] = useFocus();
  const running = !!s.endAt;
  const now = useNow(1000, running);

  useEffect(() => {
    if (!s.endAt) return;
    const t = setTimeout(() => advance(false), Math.max(0, s.endAt - Date.now()) + 50);
    return () => clearTimeout(t);
  }, [s.endAt]);

  useEffect(() => {
    document.title = running ? `${mmss(remainingMs(s, now))} · ${MODE_LABEL[s.mode]}` : 'LifeApp';
  }, [running, s, now]);

  return null;
}

export function FocusScreen() {
  const [s] = useFocus();
  const [sessions] = useSessions();
  const now = useNow(250, !!s.endAt);
  const left = remainingMs(s, now);
  const total = MINUTES[s.mode] * 60_000;
  const today = dateKey();
  const minutesOn = (d: string) => sessions.filter((x) => dateKey(x.ts) === d).reduce((m, x) => m + x.minutes, 0);
  const todaySessions = sessions.filter((x) => dateKey(x.ts) === today);
  const week = lastDays(7).map((d) => ({ label: weekdayLetter(d), value: minutesOn(d), highlight: d === today }));
  const weekTotal = week.reduce((m, d) => m + d.value, 0);
  const color = s.mode === 'focus' ? 'var(--accent)' : BREAK_COLOR;

  const changeMode = async (m: Mode) => {
    if (m === s.mode) return;
    if (s.endAt && !(await ask({ title: 'Stop the timer?', message: 'The current session will be reset.', confirmLabel: 'Stop', destructive: true }))) return;
    reset(m);
  };

  return (
    <Page meta={META.focus}>
      <Segmented label="Timer mode" value={s.mode} onChange={changeMode} options={(['focus', 'short', 'long'] as Mode[]).map((m) => ({ value: m, label: MODE_LABEL[m] }))} />
      <section className="card hero focus-hero">
        <Ring value={total - left} max={total} size={248} stroke={8} color={color}>
          <span className="focus-time">{mmss(left)}</span>
          <span className="muted small">{s.endAt ? MODE_LABEL[s.mode] : left < total ? 'Paused' : 'Ready'}</span>
        </Ring>
        <input
          className="focus-label"
          value={s.label}
          onChange={(e) => update((st) => ({ ...st, label: e.target.value }))}
          placeholder="What are you working on?"
          aria-label="What are you working on"
        />
        <div className="focus-controls">
          <button className="round-btn" onClick={() => reset()} aria-label="Reset timer">
            <RotateCcw size={20} />
          </button>
          <button className="play-btn" onClick={s.endAt ? pause : start} aria-label={s.endAt ? 'Pause' : 'Start'}>
            {s.endAt ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="nudge" />}
          </button>
          <button className="round-btn" onClick={() => advance(true)} aria-label="Skip to next phase">
            <SkipForward size={20} />
          </button>
        </div>
        <div className="cycle-dots" role="img" aria-label={`${s.cycle % 4} of 4 sessions in this set`}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={i < s.cycle % 4 ? 'on' : ''} />
          ))}
        </div>
      </section>

      <SectionTitle>Progress</SectionTitle>
      <section className="card">
        <div className="stat-grid">
          <Stat label="Today" value={fmtHM(minutesOn(today))} sub={`${todaySessions.length} session${todaySessions.length === 1 ? '' : 's'}`} />
          <Stat label="This week" value={fmtHM(weekTotal)} sub="focused" />
        </div>
        <Bars data={week} format={(v) => String(v)} />
      </section>
    </Page>
  );
}
