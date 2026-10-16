import { useState } from 'react';
import { Briefcase, Cake, CalendarClock, Gift, GraduationCap, Heart, Mountain, PartyPopper, Plane, Plus, Star, Trash2, type LucideIcon } from 'lucide-react';
import { useStore } from '../lib/store';
import { dateKey, daysBetween, fmtDate, parseKey } from '../lib/date';
import { uid } from '../lib/id';
import { haptic, removeWithUndo } from '../lib/feedback';
import { Empty, Page, SectionTitle, Sheet, Switch } from '../components/ui';
import { META } from './meta';

interface Countdown {
  id: string;
  title: string;
  date: string;
  icon: string;
  yearly: boolean;
}

const EMPTY: Countdown[] = [];
const useCountdowns = () => useStore<Countdown[]>('countdowns', EMPTY);

const ICONS: Record<string, LucideIcon> = {
  event: CalendarClock,
  birthday: Cake,
  trip: Plane,
  gift: Gift,
  love: Heart,
  party: PartyPopper,
  work: Briefcase,
  study: GraduationCap,
  outdoors: Mountain,
  special: Star,
};
const iconOf = (c: Countdown) => ICONS[c.icon] ?? CalendarClock;

/** The next date the event happens on or after today (the date itself unless it repeats yearly). */
function nextDate(c: Countdown, today: string) {
  if (!c.yearly) return c.date;
  const src = parseKey(c.date);
  const year = parseKey(today).getFullYear();
  const at = (y: number) => {
    const d = new Date(y, src.getMonth(), src.getDate());
    // Feb 29 in a non-leap year: celebrate on Feb 28.
    return d.getMonth() === src.getMonth() ? d : new Date(y, src.getMonth() + 1, 0);
  };
  const thisYear = dateKey(at(year));
  return thisYear >= today ? thisYear : dateKey(at(year + 1));
}

function daysLabel(n: number) {
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 0 ? `${n} days` : `${-n} days ago`;
}

function CountdownForm({ item, onDone }: { item: Countdown | null; onDone: () => void }) {
  const [, setItems] = useCountdowns();
  const [title, setTitle] = useState(item?.title ?? '');
  const [date, setDate] = useState(item?.date ?? '');
  const [icon, setIcon] = useState(item?.icon ?? 'event');
  const [yearly, setYearly] = useState(item?.yearly ?? false);
  const valid = !!title.trim() && /^\d{4}-\d\d-\d\d$/.test(date);
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        haptic();
        const next = { id: item?.id ?? uid(), title: title.trim(), date, icon, yearly };
        setItems((xs) => (item ? xs.map((x) => (x.id === item.id ? next : x)) : [...xs, next]));
        onDone();
      }}
    >
      <label className="field">
        <span>Name</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Trip to Tokyo" autoFocus={!item} />
      </label>
      <label className="field">
        <span>Date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="row inset-row">
        <span className="row-label">Repeats every year</span>
        <Switch label="Repeats every year" checked={yearly} onChange={setYearly} />
      </label>
      <div className="field">
        <span>Icon</span>
        <div className="icon-grid" role="radiogroup" aria-label="Icon">
          {Object.entries(ICONS).map(([key, Icon]) => (
            <button type="button" key={key} className={`icon-opt${key === icon ? ' on' : ''}`} onClick={() => setIcon(key)} role="radio" aria-checked={key === icon} aria-label={key}>
              <Icon size={20} />
            </button>
          ))}
        </div>
      </div>
      <button className="btn primary block" type="submit" disabled={!valid}>
        {item ? 'Save' : 'Add countdown'}
      </button>
      {item && (
        <button
          type="button"
          className="btn ghost danger-text block"
          onClick={() => {
            onDone();
            removeWithUndo(setItems, (x) => x.id === item.id, `${item.title} deleted`);
          }}
        >
          <Trash2 size={17} /> Delete
        </button>
      )}
    </form>
  );
}

function Row({ c, days, onOpen }: { c: Countdown; days: number; onOpen: () => void }) {
  const Icon = iconOf(c);
  const today = dateKey();
  return (
    <li>
      <button className="countdown" onClick={onOpen}>
        <span className="tile">
          <Icon size={19} />
        </span>
        <span className="log-main">
          <strong>{c.title}</strong>
          <span className="muted small">
            {fmtDate(nextDate(c, today), true)}
            {c.yearly && ' · Yearly'}
          </span>
        </span>
        <span className={`days${days === 0 ? ' now' : ''}`}>
          {Math.abs(days) > 1 ? (
            <>
              <span className="days-num">{Math.abs(days)}</span>
              <span className="muted tiny">{days > 0 ? 'days' : 'days ago'}</span>
            </>
          ) : (
            <span className="days-word">{daysLabel(days)}</span>
          )}
        </span>
      </button>
    </li>
  );
}

export function CountdownsScreen() {
  const [items] = useCountdowns();
  const [editing, setEditing] = useState<Countdown | 'new' | null>(null);
  const today = dateKey();
  const withDays = items.map((c) => ({ c, days: daysBetween(today, nextDate(c, today)) }));
  const upcoming = withDays.filter((x) => x.days >= 0).sort((a, b) => a.days - b.days);
  const past = withDays.filter((x) => x.days < 0).sort((a, b) => b.days - a.days);

  return (
    <Page
      meta={META.countdowns}
      actions={
        <button className="icon-btn" onClick={() => setEditing('new')} aria-label="New countdown">
          <Plus />
        </button>
      }
    >
      {items.length === 0 ? (
        <Empty
          icon={META.countdowns.icon}
          title="Nothing to count down to"
          text="Add a trip, a birthday or a deadline."
          action={
            <button className="btn primary" onClick={() => setEditing('new')}>
              Add a countdown
            </button>
          }
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <ul className="countdown-list">
              {upcoming.map(({ c, days }) => (
                <Row key={c.id} c={c} days={days} onOpen={() => setEditing(c)} />
              ))}
            </ul>
          )}
          {past.length > 0 && (
            <>
              <SectionTitle>Past</SectionTitle>
              <ul className="countdown-list past">
                {past.map(({ c, days }) => (
                  <Row key={c.id} c={c} days={days} onOpen={() => setEditing(c)} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
      <Sheet color={META.countdowns.color} open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New countdown' : 'Edit countdown'}>
        {editing !== null && <CountdownForm key={editing === 'new' ? 'new' : editing.id} item={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </Page>
  );
}
