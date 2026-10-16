import { useState } from 'react';
import { Bus, Ellipsis, HeartPulse, Plus, Popcorn, Receipt, ShoppingBag, ShoppingBasket, SlidersHorizontal, Trash2, Utensils, type LucideIcon } from 'lucide-react';
import { useStore } from '../lib/store';
import { dateKey, lastDays, monthKey, relDay, weekdayLetter } from '../lib/date';
import { uid } from '../lib/id';
import { navigate } from '../lib/router';
import { useSettings } from '../lib/settings';
import { haptic, removeWithUndo, toast } from '../lib/feedback';
import { Bars, Empty, Page, SectionTitle, Sheet } from '../components/ui';
import { META } from './meta';

interface Expense {
  id: string;
  /** Day the money was spent. */
  date: string;
  ts: number;
  amount: number;
  category: string;
  note: string;
}

const EMPTY: Expense[] = [];
const useExpenses = () => useStore<Expense[]>('expenses', EMPTY);

const CATEGORIES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'food', label: 'Food', icon: Utensils },
  { id: 'groceries', label: 'Groceries', icon: ShoppingBasket },
  { id: 'transport', label: 'Transport', icon: Bus },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'bills', label: 'Bills', icon: Receipt },
  { id: 'fun', label: 'Fun', icon: Popcorn },
  { id: 'health', label: 'Health', icon: HeartPulse },
  { id: 'other', label: 'Other', icon: Ellipsis },
];
const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'UZS', 'RUB', 'KZT', 'TRY', 'AED', 'INR', 'CNY', 'JPY', 'KRW'];

/** `short` drops cents from 100 up and abbreviates from 10,000 up (for tight spaces); otherwise exact. */
export function formatMoney(n: number, currency: string, short = false) {
  const compact = short && n >= 10_000;
  const whole = Number.isInteger(n) || (short && n >= 100);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
      ...(compact ? { notation: 'compact' } : {}),
    }).format(n);
  } catch {
    return `${n.toFixed(whole ? 0 : 2)} ${currency}`;
  }
}

const sum = (xs: Expense[]) => xs.reduce((s, e) => s + e.amount, 0);
const parseAmount = (s: string) => Number(s.replace(/\s/g, '').replace(',', '.'));

function ExpenseForm({ onDone }: { onDone: () => void }) {
  const [, setItems] = useExpenses();
  const [{ currency }] = useSettings();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(dateKey());
  const value = parseAmount(amount);
  const valid = value > 0 && value < 1e12 && !!date && date <= dateKey();

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        haptic();
        const rounded = Math.round(value * 100) / 100;
        setItems((xs) => [...xs, { id: uid(), date, ts: Date.now(), amount: rounded, category, note: note.trim() }]);
        toast(`${formatMoney(rounded, currency)} · ${categoryOf(category).label}`);
        onDone();
      }}
    >
      <label className="amount-field">
        <span className="muted small">Amount ({currency})</span>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0" autoFocus aria-label="Amount" />
      </label>
      <div className="cat-grid" role="radiogroup" aria-label="Category">
        {CATEGORIES.map((c) => (
          <button type="button" key={c.id} className={`cat-opt${c.id === category ? ' on' : ''}`} onClick={() => setCategory(c.id)} role="radio" aria-checked={c.id === category}>
            <c.icon size={18} />
            <span>{c.label}</span>
          </button>
        ))}
      </div>
      <div className="field-row">
        <label className="field">
          <span>Note</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </label>
        <label className="field">
          <span>Date</span>
          <input type="date" value={date} max={dateKey()} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <button className="btn primary block" type="submit" disabled={!valid}>
        Add expense
      </button>
    </form>
  );
}

function BudgetForm({ onDone }: { onDone: () => void }) {
  const [s, update] = useSettings();
  const [currency, setCurrency] = useState(s.currency);
  const [budget, setBudget] = useState(s.budget ? String(s.budget) : '');
  const value = budget.trim() ? parseAmount(budget) : 0;
  const valid = Number.isFinite(value) && value >= 0;
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        haptic();
        update({ currency, budget: Math.round(value * 100) / 100 });
        onDone();
      }}
    >
      <label className="field">
        <span>Currency</span>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Monthly budget</span>
        <input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal" placeholder="No budget" />
      </label>
      <button className="btn primary block" type="submit" disabled={!valid}>
        Save
      </button>
    </form>
  );
}

export function MoneyScreen({ param }: { param?: string }) {
  const [items, setItems] = useExpenses();
  const [{ currency, budget }] = useSettings();
  const [adding, setAdding] = useState(param === 'add');
  const [editingBudget, setEditingBudget] = useState(false);
  const fmt = (n: number) => formatMoney(n, currency);
  const today = dateKey();
  const month = monthKey();
  const monthItems = items.filter((e) => e.date.startsWith(month));
  const monthTotal = sum(monthItems);
  const todayTotal = sum(items.filter((e) => e.date === today));
  const left = budget - monthTotal;
  const byCategory = CATEGORIES.map((c) => ({ ...c, total: sum(monthItems.filter((e) => e.category === c.id)) }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
  const week = lastDays(7).map((d) => ({ label: weekdayLetter(d), value: sum(items.filter((e) => e.date === d)), highlight: d === today }));
  const recent = [...items].sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts).slice(0, 40);
  const monthName = new Date().toLocaleDateString([], { month: 'long' });

  const closeAdd = () => {
    setAdding(false);
    if (param === 'add') navigate('/m/money', { replace: true });
  };

  return (
    <Page
      meta={META.money}
      actions={
        <>
          <button className="icon-btn" onClick={() => setEditingBudget(true)} aria-label="Budget and currency">
            <SlidersHorizontal size={20} />
          </button>
          <button className="icon-btn" onClick={() => setAdding(true)} aria-label="Add expense">
            <Plus />
          </button>
        </>
      }
    >
      <section className="card hero">
        <span className="eyebrow">Spent in {monthName}</span>
        <span className="hero-num xl">{fmt(monthTotal)}</span>
        {budget > 0 ? (
          <>
            <p className="hero-note" style={left < 0 ? { color: 'var(--danger)' } : undefined}>
              {left >= 0 ? `${fmt(left)} left of ${fmt(budget)}` : `${fmt(-left)} over budget`}
            </p>
            <div className="meter wide-meter">
              <div className={`meter-fill${left < 0 ? ' over' : ''}`} style={{ width: `${Math.min(100, (monthTotal / budget) * 100)}%` }} />
            </div>
          </>
        ) : (
          <button className="btn tinted" onClick={() => setEditingBudget(true)}>
            Set a monthly budget
          </button>
        )}
        <span className="muted small">{fmt(todayTotal)} today</span>
      </section>

      <button className="btn primary block lg" onClick={() => setAdding(true)}>
        <Plus size={18} /> Add expense
      </button>

      {byCategory.length > 0 && (
        <>
          <SectionTitle>By category</SectionTitle>
          <ul className="card list">
            {byCategory.map((c) => (
              <li key={c.id} className="log-item">
                <span className="tile sm">
                  <c.icon size={15} />
                </span>
                <span className="log-main">
                  <span className="split">
                    <span>{c.label}</span>
                    <span className="strong tabular">{fmt(c.total)}</span>
                  </span>
                  <span className="meter thin">
                    <span className="meter-fill" style={{ width: `${(c.total / byCategory[0].total) * 100}%` }} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <SectionTitle>Last 7 days</SectionTitle>
      <section className="card">
        <Bars data={week} format={(v) => formatMoney(v, currency, true)} />
      </section>

      <SectionTitle>Recent</SectionTitle>
      {recent.length === 0 ? (
        <Empty icon={META.money.icon} title="No expenses yet" text="Add what you spend to see where it goes." />
      ) : (
        <ul className="card list">
          {recent.map((e) => {
            const c = categoryOf(e.category);
            return (
              <li key={e.id} className="log-item">
                <span className="tile sm">
                  <c.icon size={15} />
                </span>
                <span className="log-main">
                  <span>{e.note || c.label}</span>
                  <span className="muted small">
                    {e.note ? `${c.label} · ` : ''}
                    {relDay(e.date)}
                  </span>
                </span>
                <span className="strong tabular">{fmt(e.amount)}</span>
                <button className="icon-btn subtle" onClick={() => removeWithUndo(setItems, (x) => x.id === e.id, 'Expense deleted')} aria-label={`Delete ${fmt(e.amount)} ${c.label}`}>
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet color={META.money.color} open={adding} onClose={closeAdd} title="Add expense">
        {adding && <ExpenseForm onDone={closeAdd} />}
      </Sheet>
      <Sheet color={META.money.color} open={editingBudget} onClose={() => setEditingBudget(false)} title="Budget and currency">
        {editingBudget && <BudgetForm onDone={() => setEditingBudget(false)} />}
      </Sheet>
    </Page>
  );
}
