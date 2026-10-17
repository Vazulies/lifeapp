import { useState } from 'react';
import { Bell, Pill, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { dateKey, fmtTime, lastDays, relDay, weekdayLetter } from '../lib/date';
import { uid } from '../lib/id';
import { haptic, removeWithUndo } from '../lib/feedback';
import { Bars, Empty, Page, SectionTitle, Sheet } from '../components/ui';
import { META } from './meta';

interface Dose {
  id: string;
  med: string;
  date: string;
  ts: number;
  note: string;
}

const EMPTY: Dose[] = [];
const useMeds = () => useStore<Dose[]>('medications', EMPTY);

function AddDose({ onDone }: { onDone: () => void }) {
  const [, setDoses] = useMeds();
  const [med, setMed] = useState('');
  const [date, setDate] = useState(dateKey());
  const [note, setNote] = useState('');
  const valid = !!med.trim() && !!date && date <= dateKey();
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        haptic();
        setDoses((xs) => [...xs, { id: uid(), med: med.trim(), date, ts: Date.now(), note: note.trim() }]);
        onDone();
      }}
    >
      <label className="field">
        <span>Medication</span>
        <input value={med} onChange={(e) => setMed(e.target.value)} placeholder="Vitamin D" autoFocus />
      </label>
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
      <button className="btn primary block" type="submit" disabled={!valid}>
        Log dose
      </button>
    </form>
  );
}

export function MedicationsScreen() {
  const [doses, setDoses] = useMeds();
  const [adding, setAdding] = useState(false);
  const today = dateKey();
  const todayDoses = doses.filter((d) => d.date === today);
  const week = lastDays(7).map((d) => ({ label: weekdayLetter(d), value: doses.filter((x) => x.date === d).length, highlight: d === today }));
  const recent = [...doses].sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts).slice(0, 40);

  return (
    <Page
      meta={META.medications}
      actions={
        <button className="icon-btn" onClick={() => setAdding(true)} aria-label="Log medication">
          <Plus />
        </button>
      }
    >
      <section className="card hero">
        <span className="eyebrow">Today</span>
        <span className="hero-num xl">{todayDoses.length}</span>
        <p className="hero-note">dose{todayDoses.length === 1 ? '' : 's'} logged</p>
      </section>

      <button className="btn primary block lg" onClick={() => setAdding(true)}>
        <Plus size={18} /> Log dose
      </button>

      <SectionTitle>Last 7 days</SectionTitle>
      <section className="card">
        <Bars data={week} format={(v) => String(v)} />
      </section>

      <SectionTitle>Recent</SectionTitle>
      {recent.length === 0 ? (
        <Empty icon={META.medications.icon} title="No doses logged" text="Track what you took and when." />
      ) : (
        <ul className="card list">
          {recent.map((d) => (
            <li key={d.id} className="log-item">
              <span className="tile sm">
                <Pill size={15} />
              </span>
              <span className="log-main">
                <span>{d.med}</span>
                <span className="muted small">
                  {relDay(d.date)} · {fmtTime(d.ts)}
                  {d.note && ` · ${d.note}`}
                </span>
              </span>
              <button className="icon-btn subtle" onClick={() => removeWithUndo(setDoses, (x) => x.id === d.id, 'Dose deleted')} aria-label={`Delete ${d.med}`}>
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <section className="card stack">
        <p className="muted small with-icon">
          <Bell size={14} /> This is a simple log, not a medical reminder.
        </p>
      </section>

      <Sheet color={META.medications.color} open={adding} onClose={() => setAdding(false)} title="Log medication">
        {adding && <AddDose onDone={() => setAdding(false)} />}
      </Sheet>
    </Page>
  );
}
