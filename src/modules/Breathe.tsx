import { useEffect, useState, type CSSProperties } from 'react';
import { Play, Square } from 'lucide-react';
import { setValue, useStore } from '../lib/store';
import { dateKey, fmtHM, lastDays, weekdayLetter, weekStart } from '../lib/date';
import { uid } from '../lib/id';
import { useNow } from '../lib/hooks';
import { haptic, toast } from '../lib/feedback';
import { Bars, Page, SectionTitle, Segmented, Stat } from '../components/ui';
import { META } from './meta';

type Kind = 'in' | 'hold' | 'out';
type PatternId = 'box' | 'relax' | 'calm';

const PATTERNS: Record<PatternId, { name: string; hint: string; phases: [Kind, number][] }> = {
  box: { name: 'Box', hint: 'In 4 · hold 4 · out 4 · hold 4. Steady focus.', phases: [['in', 4], ['hold', 4], ['out', 4], ['hold', 4]] },
  relax: { name: '4-7-8', hint: 'In 4 · hold 7 · out 8. Helps you wind down.', phases: [['in', 4], ['hold', 7], ['out', 8]] },
  calm: { name: 'Calm', hint: 'In 4 · out 6. A gentle, slower rhythm.', phases: [['in', 4], ['out', 6]] },
};
const LABEL: Record<Kind, string> = { in: 'Breathe in', hold: 'Hold', out: 'Breathe out' };
const SMALL = 0.56;

interface Prefs {
  pattern: PatternId;
  minutes: number;
}
interface Session {
  id: string;
  ts: number;
  minutes: number;
}

const DEFAULT_PREFS: Prefs = { pattern: 'box', minutes: 3 };
const NO_SESSIONS: Session[] = [];
const usePrefs = () => useStore<Prefs>('breathe-prefs', DEFAULT_PREFS);
const useSessions = () => useStore<Session[]>('breathe-sessions', NO_SESSIONS);

/** Circle size for a phase; a hold keeps the size of the breath before it. */
function scaleFor(phases: [Kind, number][], i: number) {
  for (let k = 0; k < phases.length; k++) {
    const kind = phases[(i - k + phases.length) % phases.length][0];
    if (kind === 'in') return 1;
    if (kind === 'out') return SMALL;
  }
  return 1;
}

const minutesOn = (sessions: Session[], day: string) => sessions.filter((s) => dateKey(s.ts) === day).reduce((m, s) => m + s.minutes, 0);

export function BreatheScreen() {
  const [prefs, setPrefs] = usePrefs();
  const [sessions] = useSessions();
  const [run, setRun] = useState<{ start: number; phase: number; phaseStart: number } | null>(null);
  const now = useNow(200, !!run);
  const pattern = PATTERNS[prefs.pattern];

  useEffect(() => {
    if (!run) return;
    const [, secs] = pattern.phases[run.phase];
    const t = setTimeout(() => {
      const t2 = Date.now();
      const last = run.phase === pattern.phases.length - 1;
      // Only stop at the end of a full cycle, never mid-breath.
      if (last && t2 - run.start >= prefs.minutes * 60_000) {
        const minutes = Math.max(1, Math.round((t2 - run.start) / 60_000));
        setValue<Session[]>('breathe-sessions', NO_SESSIONS, (ss) => [...ss, { id: uid(), ts: t2, minutes }]);
        setRun(null);
        haptic([10, 60, 10]);
        toast(`Session complete · ${minutes} min`);
        return;
      }
      haptic(6);
      setRun({ ...run, phase: (run.phase + 1) % pattern.phases.length, phaseStart: t2 });
    }, secs * 1000);
    return () => clearTimeout(t);
  }, [run, pattern, prefs.minutes]);

  const start = () => {
    haptic();
    const t = Date.now();
    setRun({ start: t, phase: 0, phaseStart: t });
  };

  const [kind, secs] = run ? pattern.phases[run.phase] : (['in', 0] as [Kind, number]);
  const scale = run ? scaleFor(pattern.phases, run.phase) : 0.72;
  const phaseLeft = run ? Math.max(1, Math.ceil((run.phaseStart + secs * 1000 - now) / 1000)) : 0;
  const totalLeft = run ? Math.max(0, prefs.minutes * 60_000 - (now - run.start)) : prefs.minutes * 60_000;
  const today = dateKey();
  const weekFrom = dateKey(weekStart());
  const weekMinutes = sessions.filter((s) => dateKey(s.ts) >= weekFrom).reduce((m, s) => m + s.minutes, 0);
  const transition = run && kind !== 'hold' ? `transform ${secs}s cubic-bezier(0.45, 0, 0.55, 1)` : 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';

  return (
    <Page meta={META.breathe}>
      <Segmented
        label="Pattern"
        value={prefs.pattern}
        onChange={(pattern) => !run && setPrefs({ ...prefs, pattern })}
        options={(Object.keys(PATTERNS) as PatternId[]).map((id) => ({ value: id, label: PATTERNS[id].name }))}
      />
      <section className="card hero breathe-hero">
        <div className="breath-stage" aria-live="polite">
          <div className="breath-ring" />
          <div className="breath-circle" style={{ transform: `scale(${scale})`, transition } as CSSProperties} />
          <div className="breath-text">
            <span className="breath-label">{run ? LABEL[kind] : 'Ready'}</span>
            {run && <span className="breath-count tabular">{phaseLeft}</span>}
          </div>
        </div>
        <p className="muted small">{pattern.hint}</p>
        <div className="breathe-controls">
          {!run && (
            <Segmented
              label="Length"
              value={String(prefs.minutes)}
              onChange={(m) => setPrefs({ ...prefs, minutes: Number(m) })}
              options={['1', '3', '5'].map((m) => ({ value: m, label: `${m} min` }))}
            />
          )}
          <button className="play-btn" onClick={run ? () => setRun(null) : start} aria-label={run ? 'Stop' : 'Start'}>
            {run ? <Square size={22} fill="currentColor" /> : <Play size={28} fill="currentColor" className="nudge" />}
          </button>
          <span className="muted small tabular">
            {run ? `${Math.floor(totalLeft / 60_000)}:${String(Math.floor((totalLeft % 60_000) / 1000)).padStart(2, '0')} left` : `${prefs.minutes} minute session`}
          </span>
        </div>
      </section>

      <SectionTitle>Mindful minutes</SectionTitle>
      <section className="card">
        <div className="stat-grid">
          <Stat label="Today" value={fmtHM(minutesOn(sessions, today))} />
          <Stat label="This week" value={fmtHM(weekMinutes)} />
          <Stat label="Sessions" value={sessions.length} sub="all time" />
        </div>
        <Bars data={lastDays(7).map((d) => ({ label: weekdayLetter(d), value: minutesOn(sessions, d), highlight: d === today }))} format={(v) => String(v)} />
      </section>
    </Page>
  );
}
