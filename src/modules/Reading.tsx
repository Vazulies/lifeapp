import { useState } from 'react';
import { BookCheck, BookMarked, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { dateKey, lastDays, relDay, weekdayLetter } from '../lib/date';
import { uid } from '../lib/id';
import { haptic, removeWithUndo, toast } from '../lib/feedback';
import { Bars, Empty, local, Page, SectionTitle, Segmented, Sheet, Stat } from '../components/ui';
import { META } from './meta';

type Status = 'reading' | 'want' | 'done';

interface Book {
  id: string;
  title: string;
  author: string;
  pages: number;
  current: number;
  status: Status;
  addedAt: number;
  finishedAt?: number;
  /** Pages read per day. */
  log: Record<string, number>;
}

const EMPTY: Book[] = [];
const useBooks = () => useStore<Book[]>('books', EMPTY);

const pct = (b: Book) => (b.pages ? Math.round((b.current / b.pages) * 100) : 0);
const pagesOn = (books: Book[], day: string) => books.reduce((s, b) => s + (b.log[day] ?? 0), 0);

/** Move a book to `page`, logging forward progress for today and finishing it at the last page. */
function withPage(b: Book, page: number): Book {
  const current = Math.max(0, Math.min(b.pages, Math.round(page)));
  const delta = current - b.current;
  const today = dateKey();
  const log = delta > 0 ? { ...b.log, [today]: (b.log[today] ?? 0) + delta } : b.log;
  const done = current >= b.pages;
  return { ...b, current, log, status: done ? 'done' : 'reading', finishedAt: done ? (b.finishedAt ?? Date.now()) : undefined };
}

function setPage(setBooks: (u: (bs: Book[]) => Book[]) => void, book: Book, page: number) {
  const next = withPage(book, page);
  setBooks((bs) => bs.map((b) => (b.id === book.id ? next : b)));
  if (next.status === 'done' && book.status !== 'done') {
    haptic([10, 50, 10, 50, 10]);
    toast(`Finished ${book.title}`);
  } else haptic();
}

function AddBook({ onDone }: { onDone: () => void }) {
  const [, setBooks] = useBooks();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [pages, setPages] = useState('');
  const [status, setStatus] = useState<'reading' | 'want'>('reading');
  const n = Math.round(Number(pages));
  const valid = !!title.trim() && n > 0 && n < 100_000;
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        haptic();
        setBooks((bs) => [...bs, { id: uid(), title: title.trim(), author: author.trim(), pages: n, current: 0, status, addedAt: Date.now(), log: {} }]);
        onDone();
      }}
    >
      <label className="field">
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Deep Work" autoFocus />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Author</span>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Optional" />
        </label>
        <label className="field">
          <span>Pages</span>
          <input value={pages} onChange={(e) => setPages(e.target.value)} inputMode="numeric" placeholder="300" />
        </label>
      </div>
      <Segmented
        label="Shelf"
        value={status}
        onChange={setStatus}
        options={[
          { value: 'reading', label: 'Reading now' },
          { value: 'want', label: 'Want to read' },
        ]}
      />
      <button className="btn primary block" type="submit" disabled={!valid}>
        Add book
      </button>
    </form>
  );
}

function BookSheet({ book, onDone }: { book: Book; onDone: () => void }) {
  const [, setBooks] = useBooks();
  const [page, setPageText] = useState(String(book.current));
  const n = Math.round(Number(page));
  const valid = Number.isFinite(n) && n >= 0 && n <= book.pages;
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        setPage(setBooks, book, n);
        onDone();
      }}
    >
      <p className="muted small">
        {book.author ? `${book.author} · ` : ''}
        {book.pages} pages
      </p>
      <label className="field">
        <span>Current page</span>
        <input value={page} onChange={(e) => setPageText(e.target.value)} inputMode="numeric" autoFocus />
      </label>
      <button className="btn primary block" type="submit" disabled={!valid}>
        Update progress
      </button>
      {book.status !== 'done' && (
        <button type="button" className="btn secondary block" onClick={() => (setPage(setBooks, book, book.pages), onDone())}>
          <BookCheck size={17} /> Mark as finished
        </button>
      )}
      <button
        type="button"
        className="btn ghost danger-text block"
        onClick={() => {
          onDone();
          removeWithUndo(setBooks, (b) => b.id === book.id, `${book.title} removed`);
        }}
      >
        <Trash2 size={17} /> Remove book
      </button>
    </form>
  );
}

export function ReadingScreen() {
  const [books, setBooks] = useBooks();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<Book | null>(null);
  const today = dateKey();
  const reading = books.filter((b) => b.status === 'reading');
  const want = books.filter((b) => b.status === 'want');
  const done = books.filter((b) => b.status === 'done').sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0));
  const year = new Date().getFullYear();
  const days = lastDays(7);
  const weekPages = days.reduce((s, d) => s + pagesOn(books, d), 0);

  return (
    <Page
      meta={META.reading}
      actions={
        <button className="icon-btn" onClick={() => setAdding(true)} aria-label="Add book">
          <Plus />
        </button>
      }
    >
      {books.length === 0 ? (
        <Empty
          icon={META.reading.icon}
          title="Your shelf is empty"
          text="Add the book you are reading to start tracking pages."
          action={
            <button className="btn primary" onClick={() => setAdding(true)}>
              Add a book
            </button>
          }
        />
      ) : (
        <>
          <section className="card">
            <div className="stat-grid">
              <Stat label="Today" value={pagesOn(books, today)} sub="pages" />
              <Stat label="7 days" value={weekPages} sub="pages" />
              <Stat label={String(year)} value={done.filter((b) => b.finishedAt && new Date(b.finishedAt).getFullYear() === year).length} sub="finished" />
            </div>
            <Bars data={days.map((d) => ({ label: weekdayLetter(d), value: pagesOn(books, d), highlight: d === today }))} format={(v) => String(v)} />
          </section>

          {reading.length > 0 && <SectionTitle>Reading now</SectionTitle>}
          {reading.map((b) => (
            <section key={b.id} className="card book" onClick={() => setOpen(b)}>
              <div className="book-head">
                <span className="book-spine" aria-hidden />
                <span className="book-text">
                  <strong>{b.title}</strong>
                  {b.author && <span className="muted small">{b.author}</span>}
                </span>
                <span className="strong tabular">{pct(b)}%</span>
              </div>
              <div className="meter">
                <div className="meter-fill" style={{ width: `${pct(b)}%` }} />
              </div>
              <div className="book-foot">
                <span className="muted small tabular">
                  Page {b.current} of {b.pages}
                </span>
                <button className="btn tinted sm" onClick={local(() => setPage(setBooks, b, b.current + 10))}>
                  +10 pages
                </button>
              </div>
            </section>
          ))}

          {want.length > 0 && (
            <>
              <SectionTitle>Want to read</SectionTitle>
              <ul className="card list">
                {want.map((b) => (
                  <li key={b.id} className="log-item">
                    <span className="tile sm">
                      <BookMarked size={15} />
                    </span>
                    <button className="log-main log-button" onClick={() => setOpen(b)}>
                      <span>{b.title}</span>
                      <span className="muted small">{[b.author, `${b.pages} pages`].filter(Boolean).join(' · ')}</span>
                    </button>
                    <button
                      className="pill"
                      onClick={() => {
                        haptic();
                        setBooks((bs) => bs.map((x) => (x.id === b.id ? { ...x, status: 'reading' } : x)));
                      }}
                    >
                      Start
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {done.length > 0 && (
            <>
              <SectionTitle>Finished</SectionTitle>
              <ul className="card list">
                {done.map((b) => (
                  <li key={b.id} className="log-item">
                    <span className="tile sm">
                      <BookCheck size={15} />
                    </span>
                    <button className="log-main log-button" onClick={() => setOpen(b)}>
                      <span>{b.title}</span>
                      <span className="muted small">
                        {[b.author, b.finishedAt && relDay(dateKey(b.finishedAt))].filter(Boolean).join(' · ')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <Sheet color={META.reading.color} open={adding} onClose={() => setAdding(false)} title="Add book">
        {adding && <AddBook onDone={() => setAdding(false)} />}
      </Sheet>
      <Sheet color={META.reading.color} open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ''}>
        {open && <BookSheet key={open.id} book={books.find((b) => b.id === open.id) ?? open} onDone={() => setOpen(null)} />}
      </Sheet>
    </Page>
  );
}
