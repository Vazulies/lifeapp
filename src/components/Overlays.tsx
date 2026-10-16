import { useEffect } from 'react';
import { answer, dismissToast, haptic, useQuestion, useToasts } from '../lib/feedback';

function Toaster() {
  const toasts = useToasts();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span>{t.message}</span>
          {t.action && (
            <button
              onClick={() => {
                haptic();
                t.action!.run();
                dismissToast(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function Dialog() {
  const q = useQuestion();
  useEffect(() => {
    if (!q) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && answer(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q]);
  if (!q) return null;
  return (
    <div className="dialog-backdrop" onClick={() => answer(false)}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-label={q.title} onClick={(e) => e.stopPropagation()}>
        <h2>{q.title}</h2>
        {q.message && <p>{q.message}</p>}
        <div className="dialog-actions">
          <button className="btn secondary" onClick={() => answer(false)}>
            Cancel
          </button>
          <button className={`btn ${q.destructive ? 'destructive' : 'primary'}`} onClick={() => answer(true)} autoFocus>
            {q.confirmLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Overlays() {
  return (
    <>
      <Toaster />
      <Dialog />
    </>
  );
}
