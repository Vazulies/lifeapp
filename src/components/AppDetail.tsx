import { Check, Lock, Plus } from 'lucide-react';
import { AppIcon } from './ui';
import { haptic, toast } from '../lib/feedback';
import { openApp } from '../lib/launcher';
import { setInstalled } from '../lib/settings';
import type { ModuleMeta } from '../modules/meta';

export function setOnHome(m: ModuleMeta, on: boolean) {
  setInstalled(m.id, on);
  haptic(on ? [8, 40, 8] : 8);
  toast(on ? `${m.name} added to Home` : `${m.name} removed from Home`, { label: 'Undo', run: () => setInstalled(m.id, !on) });
}

/** "About this app" content, used by the Library, Home long-press and the in-app ••• menu. */
export function AppDetail({ m, installed, onClose, inApp }: { m: ModuleMeta; installed: boolean; onClose: () => void; inApp?: boolean }) {
  return (
    <div className="app-detail">
      <AppIcon meta={m} size="xl" />
      <h2>{m.name}</h2>
      <p className="muted">{m.tagline}</p>
      <p className="detail-desc">{m.description}</p>
      <ul className="feature-list">
        {m.features.map((f) => (
          <li key={f}>
            <Check size={16} />
            {f}
          </li>
        ))}
      </ul>
      <p className="privacy-line">
        <Lock size={13} /> Data stays on this device
      </p>
      <div className="stack tight">
        {!inApp && (
          <button
            className="btn primary block"
            onClick={(e) => {
              onClose();
              openApp(m.id, e.currentTarget);
            }}
          >
            Open {m.name}
          </button>
        )}
        {installed ? (
          <button className={`btn ${inApp ? 'secondary' : 'ghost'} block`} onClick={() => setOnHome(m, false)}>
            Remove from Home
          </button>
        ) : (
          <button className={`btn ${inApp ? 'primary' : 'secondary'} block`} onClick={() => setOnHome(m, true)}>
            <Plus size={18} /> Add to Home
          </button>
        )}
      </div>
    </div>
  );
}
