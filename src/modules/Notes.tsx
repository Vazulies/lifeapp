import { useEffect, useState } from 'react';
import { Pin, PinOff, Plus, Search, Trash2 } from 'lucide-react';
import { setValue, useStore } from '../lib/store';
import { dateKey, fmtTime, relDay } from '../lib/date';
import { uid } from '../lib/id';
import { goBack, navigate } from '../lib/router';
import { haptic, removeWithUndo } from '../lib/feedback';
import { Empty, Page } from '../components/ui';
import { META } from './meta';

interface Note {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  updatedAt: number;
}

const EMPTY: Note[] = [];
const useNotes = () => useStore<Note[]>('notes', EMPTY);
const isBlank = (n: Note) => !n.title.trim() && !n.body.trim();
const titleOf = (n: Note) => n.title.trim() || n.body.trim().split('\n')[0] || 'Untitled';

function when(ts: number) {
  return dateKey(ts) === dateKey() ? fmtTime(ts) : relDay(dateKey(ts));
}

/** Drop notes that were opened and left empty. */
function purgeBlank() {
  setValue<Note[]>('notes', EMPTY, (ns) => (ns.some(isBlank) ? ns.filter((n) => !isBlank(n)) : ns));
}

function createNote() {
  haptic();
  const n: Note = { id: uid(), title: '', body: '', pinned: false, updatedAt: Date.now() };
  setValue<Note[]>('notes', EMPTY, (ns) => [n, ...ns]);
  navigate('/m/notes/' + n.id);
}

function Editor({ id }: { id: string }) {
  const [notes, setNotes] = useNotes();
  const note = notes.find((n) => n.id === id);
  if (!note) {
    return (
      <Page meta={META.notes} title="" onBack={() => goBack('/m/notes')}>
        <Empty icon={META.notes.icon} title="Note not found" />
      </Page>
    );
  }
  const patch = (p: Partial<Note>) => setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, ...p, updatedAt: Date.now() } : n)));

  return (
    <Page
      meta={META.notes}
      title=""
      onBack={() => goBack('/m/notes')}
      actions={
        <>
          <button
            className="icon-btn"
            onClick={() => {
              haptic(6);
              patch({ pinned: !note.pinned });
            }}
            aria-label={note.pinned ? 'Unpin' : 'Pin'}
            aria-pressed={note.pinned}
          >
            {note.pinned ? <PinOff /> : <Pin />}
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              if (isBlank(note)) setNotes((ns) => ns.filter((n) => n.id !== id));
              else removeWithUndo(setNotes, (n) => n.id === id, 'Note deleted');
              goBack('/m/notes');
            }}
            aria-label="Delete note"
          >
            <Trash2 />
          </button>
        </>
      }
    >
      <div className="note-editor">
        <input className="note-title-input" value={note.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Title" aria-label="Title" />
        <span className="muted tiny">Edited {when(note.updatedAt)}</span>
        <textarea className="note-body" value={note.body} onChange={(e) => patch({ body: e.target.value })} placeholder="Start writing" aria-label="Note" autoFocus={isBlank(note)} />
      </div>
    </Page>
  );
}

function NoteCard({ note }: { note: Note }) {
  const preview = note.title.trim() ? note.body.trim() : note.body.trim().split('\n').slice(1).join('\n').trim();
  return (
    <li>
      <button className="note-card" onClick={() => navigate('/m/notes/' + note.id)}>
        <strong>{titleOf(note)}</strong>
        {preview && <span className="note-preview">{preview}</span>}
        <span className="muted tiny note-meta">
          {note.pinned && <Pin size={11} />} {when(note.updatedAt)}
        </span>
      </button>
    </li>
  );
}

function NotesList() {
  const [notes] = useNotes();
  const [q, setQ] = useState('');

  useEffect(purgeBlank, []);

  const query = q.trim().toLowerCase();
  const shown = notes
    .filter((n) => !isBlank(n) && (!query || (n.title + '\n' + n.body).toLowerCase().includes(query)))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const pinned = shown.filter((n) => n.pinned);
  const others = shown.filter((n) => !n.pinned);

  return (
    <Page
      meta={META.notes}
      actions={
        <button className="icon-btn" onClick={createNote} aria-label="New note">
          <Plus />
        </button>
      }
    >
      {notes.some((n) => !isBlank(n)) ? (
        <>
          <label className="search">
            <Search size={17} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" type="search" aria-label="Search notes" />
          </label>
          {pinned.length > 0 && (
            <>
              <h3 className="group-label">Pinned</h3>
              <ul className="note-grid">
                {pinned.map((n) => (
                  <NoteCard key={n.id} note={n} />
                ))}
              </ul>
            </>
          )}
          {others.length > 0 && (
            <>
              {pinned.length > 0 && <h3 className="group-label">Notes</h3>}
              <ul className="note-grid">
                {others.map((n) => (
                  <NoteCard key={n.id} note={n} />
                ))}
              </ul>
            </>
          )}
          {shown.length === 0 && <Empty icon={Search} title="No matches" />}
        </>
      ) : (
        <Empty
          icon={META.notes.icon}
          title="No notes yet"
          text="Capture ideas, lists and thoughts."
          action={
            <button className="btn primary" onClick={createNote}>
              Write a note
            </button>
          }
        />
      )}
    </Page>
  );
}

export function NotesScreen({ param }: { param?: string }) {
  return param ? <Editor id={param} /> : <NotesList />;
}
