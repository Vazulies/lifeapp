import { useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { dateKey, relDay } from '../lib/date';
import { uid } from '../lib/id';
import { haptic, removeWithUndo } from '../lib/feedback';
import { Empty, Page, Sheet } from '../components/ui';
import { META } from './meta';

interface Entry {
  id: string;
  date: string;
  text: string;
  ts: number;
}

const EMPTY: Entry[] = [];
const useJournal = () => useStore<Entry[]>('journal', EMPTY);

function AddEntry({ onDone }: { onDone: () => void }) {
  const [, setEntries] = useJournal();
  const [date, setDate] = useState(dateKey());
  const [text, setText] = useState('');
  const valid = !!text.trim() && !!date && date <= dateKey();
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        haptic();
        setEntries((xs) => [...xs, { id: uid(), date, text: text.trim(), ts: Date.now() }]);
        onDone();
      }}
    >
      <label className="field">
        <span>Date</span>
        <input type="date" value={date} max={dateKey()} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="field">
        <span>Entry</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="How did today feel?" autoFocus />
      </label>
      <button className="btn primary block" type="submit" disabled={!valid}>
        Save entry
      </button>
    </form>
  );
}

export function JournalScreen() {
  const [entries, setEntries] = useJournal();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const shown = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts)
    .filter((e) => {
      const query = q.trim().toLowerCase();
      return !query || e.text.toLowerCase().includes(query);
    })
    .slice(0, 60);

  return (
    <Page
      meta={META.journal}
      actions={
        <button className="icon-btn" onClick={() => setAdding(true)} aria-label="New entry">
          <Plus />
        </button>
      }
    >
      {entries.length === 0 ? (
        <Empty
          icon={META.journal.icon}
          title="No journal entries yet"
          text="Write a few lines each day to spot patterns over time."
          action={
            <button className="btn primary" onClick={() => setAdding(true)}>
              Write entry
            </button>
          }
        />
      ) : (
        <>
          <label className="search">
            <Search size={17} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search entries" type="search" aria-label="Search journal" />
          </label>
          {shown.length === 0 ? (
            <Empty icon={Search} title="No matches" />
          ) : (
            <ul className="note-grid">
              {shown.map((e) => (
                <li key={e.id}>
                  <article className="note-card">
                    <strong>{relDay(e.date)}</strong>
                    <span className="note-preview">{e.text}</span>
                    <span className="muted tiny note-meta">{new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button className="icon-btn subtle" onClick={() => removeWithUndo(setEntries, (x) => x.id === e.id, 'Entry deleted')} aria-label={`Delete entry for ${relDay(e.date)}`}>
                      <Trash2 size={16} />
                    </button>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Sheet color={META.journal.color} open={adding} onClose={() => setAdding(false)} title="New entry">
        {adding && <AddEntry onDone={() => setAdding(false)} />}
      </Sheet>
    </Page>
  );
}
