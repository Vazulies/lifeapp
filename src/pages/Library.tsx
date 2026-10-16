import { useState } from 'react';
import { Check, Lock, Plus } from 'lucide-react';
import { AppIcon, LargeTitle, SectionTitle, Sheet } from '../components/ui';
import { AppDetail, setOnHome } from '../components/AppDetail';
import { useSettings } from '../lib/settings';
import { MODULES, type AppModule } from '../modules/registry';

function AppRow({ m, installed, onOpen }: { m: AppModule; installed: boolean; onOpen: () => void }) {
  return (
    <li className="lib-row">
      <button className="lib-main" onClick={onOpen} aria-label={`About ${m.name}`}>
        <AppIcon meta={m} />
        <span className="lib-text">
          <strong>{m.name}</strong>
          <span className="muted small">{m.tagline}</span>
        </span>
      </button>
      {installed ? (
        <button className="pill added" onClick={() => setOnHome(m, false)} aria-label={`Remove ${m.name} from Home`}>
          <Check size={14} className="bold" /> Added
        </button>
      ) : (
        <button className="pill" onClick={() => setOnHome(m, true)} aria-label={`Add ${m.name} to Home`}>
          <Plus size={14} className="bold" /> Add
        </button>
      )}
    </li>
  );
}

export function Library() {
  const [{ installed }] = useSettings();
  const [openId, setOpenId] = useState<string | null>(null);
  const onHome = MODULES.filter((m) => installed.includes(m.id));
  const more = MODULES.filter((m) => !installed.includes(m.id));
  const open = MODULES.find((m) => m.id === openId);

  return (
    <div className="page">
      <LargeTitle title="Library" subtitle={`${onHome.length} of ${MODULES.length} apps on your Home`} />

      {onHome.length > 0 && (
        <>
          <SectionTitle>On your Home</SectionTitle>
          <ul className="card list">
            {onHome.map((m) => (
              <AppRow key={m.id} m={m} installed onOpen={() => setOpenId(m.id)} />
            ))}
          </ul>
        </>
      )}

      {more.length > 0 && (
        <>
          <SectionTitle>More apps</SectionTitle>
          <ul className="card list">
            {more.map((m) => (
              <AppRow key={m.id} m={m} installed={false} onOpen={() => setOpenId(m.id)} />
            ))}
          </ul>
        </>
      )}

      <p className="footnote">
        <Lock size={13} /> Every app stores its data only on this device.
      </p>

      <Sheet open={!!open} onClose={() => setOpenId(null)} title={open?.name ?? ''} hideTitle color={open?.color}>
        {open && <AppDetail m={open} installed={installed.includes(open.id)} onClose={() => setOpenId(null)} />}
      </Sheet>
    </div>
  );
}
