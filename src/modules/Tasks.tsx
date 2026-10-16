import { useState, type FormEvent } from 'react';
import { ArrowUp, CalendarDays, Check, CircleCheck, Flag, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { addDays, dateKey, relDay } from '../lib/date';
import { uid } from '../lib/id';
import { haptic, removeWithUndo, toast } from '../lib/feedback';
import { Empty, local, Page, Segmented } from '../components/ui';
import { META } from './meta';

export interface Task {
  id: string;
  title: string;
  done: boolean;
  important: boolean;
  /** YYYY-MM-DD, or undefined for "someday". */
  due?: string;
  createdAt: number;
  doneAt?: number;
}

const EMPTY: Task[] = [];
const useTasks = () => useStore<Task[]>('tasks', EMPTY);

type Filter = 'today' | 'upcoming' | 'someday' | 'done';

function inFilter(t: Task, f: Filter, today: string) {
  switch (f) {
    case 'today':
      return !t.done && !!t.due && t.due <= today;
    case 'upcoming':
      return !t.done && !!t.due && t.due > today;
    case 'someday':
      return !t.done && !t.due;
    case 'done':
      return t.done;
  }
}

function byOrder(a: Task, b: Task) {
  if (a.done && b.done) return (b.doneAt ?? 0) - (a.doneAt ?? 0);
  const ad = a.due ?? '~';
  const bd = b.due ?? '~';
  if (ad !== bd) return ad < bd ? -1 : 1;
  return Number(b.important) - Number(a.important) || a.createdAt - b.createdAt;
}

const toggle = (tasks: Task[], id: string) =>
  tasks.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: t.done ? undefined : Date.now() } : t));

function TaskRow({ task, today, onToggle, onDelete }: { task: Task; today: string; onToggle: () => void; onDelete?: () => void }) {
  const overdue = !task.done && !!task.due && task.due < today;
  const showDue = task.due && task.due !== today;
  return (
    <li className={`task${task.done ? ' done' : ''}`}>
      <button
        className={`check${task.important ? ' important' : ''}${task.done ? ' on' : ''}`}
        onClick={local(() => {
          haptic(task.done ? 6 : [8, 40, 8]);
          onToggle();
        })}
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.title}
      >
        <Check size={13} className="bold" />
      </button>
      <div className="task-main">
        <span className="task-title">{task.title}</span>
        {(showDue || task.important) && (
          <span className={`task-meta${overdue ? ' overdue' : ''}`}>
            {task.important && <Flag size={11} className="flag-icon" />}
            {showDue && (overdue ? `Overdue · ${relDay(task.due!)}` : relDay(task.due!))}
          </span>
        )}
      </div>
      {onDelete && (
        <button className="icon-btn subtle" onClick={onDelete} aria-label={`Delete ${task.title}`}>
          <Trash2 size={17} />
        </button>
      )}
    </li>
  );
}

export function TasksScreen() {
  const [tasks, setTasks] = useTasks();
  const today = dateKey();
  const tomorrow = dateKey(addDays(new Date(), 1));
  const [filter, setFilter] = useState<Filter>('today');
  const [title, setTitle] = useState('');
  const [due, setDue] = useState<string>(today);
  const [important, setImportant] = useState(false);

  const changeFilter = (f: Filter) => {
    setFilter(f);
    setDue(f === 'upcoming' ? tomorrow : f === 'someday' ? '' : today);
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    haptic();
    setTasks((ts) => [...ts, { id: uid(), title: t, done: false, important, due: due || undefined, createdAt: Date.now() }]);
    setTitle('');
    setImportant(false);
  };

  const clearDone = () => {
    const done = tasks.filter((t) => t.done);
    setTasks((ts) => ts.filter((t) => !t.done));
    haptic();
    toast(`Cleared ${done.length} completed`, { label: 'Undo', run: () => setTasks((ts) => [...ts, ...done]) });
  };

  const count = (f: Filter) => tasks.filter((t) => inFilter(t, f, today)).length;
  const visible = tasks.filter((t) => inFilter(t, filter, today)).sort(byOrder);
  const label = (name: string, f: Filter) => {
    const n = count(f);
    return n && f !== 'done' ? (
      <>
        {name} <span className="count">{n}</span>
      </>
    ) : (
      name
    );
  };
  const customDate = due && due !== today && due !== tomorrow;

  return (
    <Page meta={META.tasks}>
      <form className="card composer" onSubmit={add}>
        <div className="composer-row">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task" aria-label="Task title" enterKeyHint="done" />
          <button
            type="button"
            className={`flag-toggle${important ? ' on' : ''}`}
            onClick={() => {
              haptic(6);
              setImportant(!important);
            }}
            aria-pressed={important}
            aria-label="Important"
          >
            <Flag size={17} />
          </button>
          <button className="send-btn" type="submit" aria-label="Add task" disabled={!title.trim()}>
            <ArrowUp size={18} />
          </button>
        </div>
        <div className="chips">
          <button type="button" className={`chip${due === today ? ' on' : ''}`} onClick={() => setDue(today)}>
            Today
          </button>
          <button type="button" className={`chip${due === tomorrow ? ' on' : ''}`} onClick={() => setDue(tomorrow)}>
            Tomorrow
          </button>
          <label className={`chip date-chip${customDate ? ' on' : ''}`}>
            <CalendarDays size={13} />
            {customDate ? relDay(due) : 'Date'}
            <input type="date" value={due} min={today} onChange={(e) => setDue(e.target.value)} aria-label="Due date" />
          </label>
          <button type="button" className={`chip${!due ? ' on' : ''}`} onClick={() => setDue('')}>
            Someday
          </button>
        </div>
      </form>

      <Segmented
        label="Task lists"
        value={filter}
        onChange={changeFilter}
        options={[
          { value: 'today', label: label('Today', 'today') },
          { value: 'upcoming', label: label('Upcoming', 'upcoming') },
          { value: 'someday', label: label('Someday', 'someday') },
          { value: 'done', label: 'Done' },
        ]}
      />

      {visible.length === 0 ? (
        <Empty
          icon={CircleCheck}
          title={filter === 'done' ? 'Nothing completed yet' : 'All clear'}
          text={
            filter === 'today'
              ? 'Nothing due today.'
              : filter === 'upcoming'
                ? 'Nothing scheduled ahead.'
                : filter === 'someday'
                  ? 'No undated tasks.'
                  : 'Completed tasks show up here.'
          }
        />
      ) : (
        <ul className="card list task-list">
          {visible.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              today={today}
              onToggle={() => setTasks((ts) => toggle(ts, t.id))}
              onDelete={() => removeWithUndo(setTasks, (x) => x.id === t.id, 'Task deleted')}
            />
          ))}
        </ul>
      )}

      {filter === 'done' && visible.length > 0 && (
        <button className="btn ghost block" onClick={clearDone}>
          Clear completed
        </button>
      )}
    </Page>
  );
}
