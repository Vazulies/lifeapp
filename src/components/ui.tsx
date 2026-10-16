import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Ellipsis, Minus, Plus, X, type LucideIcon } from 'lucide-react';
import { goBack } from '../lib/router';
import { haptic } from '../lib/feedback';
import type { ModuleMeta } from '../modules/meta';
import { useAppWindow } from './appContext';

export const accent = (color: string) => ({ '--accent': color }) as CSSProperties;

/** Wraps a handler so it does not also trigger the surrounding clickable card. */
export const local = (fn: () => void) => (e: { stopPropagation(): void }) => {
  e.stopPropagation();
  fn();
};

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="logo" style={{ width: size, height: size }} aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

export function AppIcon({ meta, size = 'md' }: { meta: ModuleMeta; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const Icon = meta.icon;
  return (
    <span className={`app-icon ${size}`} style={accent(meta.color)} aria-hidden>
      <Icon />
    </span>
  );
}

export function Page({
  meta,
  title,
  actions,
  onBack,
  children,
}: {
  meta?: ModuleMeta;
  title?: ReactNode;
  actions?: ReactNode;
  /** Shows a back button (for sub-pages such as the note editor). */
  onBack?: () => void;
  children: ReactNode;
}) {
  const win = useAppWindow();
  const back = onBack ?? (win ? undefined : () => goBack('/'));
  return (
    <div className="page" style={meta ? accent(meta.color) : undefined}>
      <header className="page-header">
        {back ? (
          <button className="icon-btn" onClick={back} aria-label="Back">
            <ChevronLeft />
          </button>
        ) : (
          win && <AppIcon meta={win.meta} size="sm" />
        )}
        <h1>{title ?? meta?.name}</h1>
        <div className="page-actions">{actions}</div>
        {win && (
          <div className="capsule">
            <button onClick={win.showAbout} aria-label={`About ${win.meta.name}`}>
              <Ellipsis size={18} />
            </button>
            <span className="capsule-divider" aria-hidden />
            <button onClick={win.close} aria-label={`Close ${win.meta.name}`}>
              <X size={18} />
            </button>
          </div>
        )}
      </header>
      {children}
    </div>
  );
}

export function LargeTitle({ eyebrow, title, subtitle, brand }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; brand?: boolean }) {
  return (
    <header className="large-title">
      {brand && (
        <div className="brand">
          <Logo size={22} />
          <span>LifeApp</span>
        </div>
      )}
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {subtitle && <p className="muted">{subtitle}</p>}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {action}
    </div>
  );
}

export function Ring({
  value,
  max,
  size = 120,
  stroke = 10,
  color = 'var(--accent)',
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="ring-progress"
          opacity={p > 0 ? 1 : 0}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  highlight?: boolean;
}

export function Bars({ data, goal, format }: { data: BarDatum[]; goal?: number; format?: (v: number) => string }) {
  const top = Math.max(goal ?? 0, ...data.map((d) => d.value)) * 1.12 || 1;
  return (
    <div className="bars">
      <div className="bars-plot">
        {goal ? <div className="bars-goal" style={{ bottom: `${(goal / top) * 100}%` }} /> : null}
        {data.map((d, i) => (
          <div className="bar-col" key={i}>
            <span className="bar-value">{d.value > 0 && format ? format(d.value) : ''}</span>
            <div className={`bar${d.highlight ? ' hl' : ''}`} style={{ height: `${(d.value / top) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="bars-labels">
        {data.map((d, i) => (
          <span key={i} className={d.highlight ? 'hl' : undefined}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  hideTitle,
  color,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  hideTitle?: boolean;
  /** Accent color; needed because the portal leaves the page's CSS scope. */
  color?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [open, onClose]);
  if (!open) return null;
  // Portal to <body> so no animated or blurred ancestor can trap it under the tab bar.
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" style={color ? accent(color) : undefined} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grabber" aria-hidden />
        <div className={`sheet-head${hideTitle ? ' bare' : ''}`}>
          {!hideTitle && <h2>{title}</h2>}
          <button className="icon-btn subtle" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? 'active' : ''}
          onClick={() => {
            if (o.value !== value) haptic(6);
            onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({
  label,
  value,
  unit,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const set = (v: number) => {
    const n = Math.min(max, Math.max(min, Math.round(v / step) * step));
    if (n !== value) {
      haptic(6);
      onChange(n);
    }
  };
  return (
    <div className="row">
      <span className="row-label">{label}</span>
      <div className="stepper">
        <button type="button" onClick={() => set(value - step)} disabled={value <= min} aria-label={`Decrease ${label}`}>
          <Minus size={16} />
        </button>
        <output aria-live="polite">
          {value}
          <span className="unit">{unit}</span>
        </output>
        <button type="button" onClick={() => set(value + step)} disabled={value >= max} aria-label={`Increase ${label}`}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="switch">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        onChange={(e) => {
          haptic(6);
          onChange(e.target.checked);
        }}
      />
      <span />
    </span>
  );
}

export function Empty({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={24} />
      </span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}
