import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, Plus } from 'lucide-react';
import { greeting } from '../lib/date';
import { useNow } from '../lib/hooks';
import { useSettings } from '../lib/settings';
import { navigate } from '../lib/router';
import { openApp } from '../lib/launcher';
import { haptic } from '../lib/feedback';
import { MODULES, type AppModule } from '../modules/registry';
import { accent, AppIcon, Empty, LargeTitle, Sheet } from '../components/ui';
import { AppDetail } from '../components/AppDetail';

const LONG_PRESS_MS = 450;

function Badge({ use }: { use: () => number }) {
  const n = use();
  return n > 0 ? <span className="badge">{n > 99 ? '99+' : n}</span> : null;
}

function AppTile({ m, onLongPress }: { m: AppModule; onLongPress: () => void }) {
  const timer = useRef<number | undefined>(undefined);
  const fired = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const cancel = () => window.clearTimeout(timer.current);
  useEffect(() => cancel, []);

  const longPress = () => {
    if (fired.current) return;
    fired.current = true;
    haptic(15);
    onLongPress();
  };

  return (
    <li>
      <button
        className="launcher-tile"
        style={accent(m.color)}
        onPointerDown={(e) => {
          fired.current = false;
          start.current = { x: e.clientX, y: e.clientY };
          cancel();
          timer.current = window.setTimeout(longPress, LONG_PRESS_MS);
        }}
        onPointerMove={(e) => {
          if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 8) cancel();
        }}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => {
          e.preventDefault();
          cancel();
          longPress();
        }}
        onClick={(e) => {
          if (fired.current) {
            fired.current = false;
            return;
          }
          openApp(m.id, e.currentTarget.querySelector('.app-icon'));
        }}
      >
        <span className="launcher-icon">
          <AppIcon meta={m} size="lg" />
          {m.useBadge && <Badge use={m.useBadge} />}
        </span>
        <span className="launcher-name">{m.name}</span>
      </button>
    </li>
  );
}

export function Home() {
  const [settings] = useSettings();
  const [aboutId, setAboutId] = useState<string | null>(null);
  useNow(60_000); // keep greeting and date fresh
  const apps = MODULES.filter((m) => settings.installed.includes(m.id));
  const about = MODULES.find((m) => m.id === aboutId);
  const name = settings.name.trim();
  const date = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="page">
      <LargeTitle brand eyebrow={date} title={`${greeting()}${name ? `, ${name}` : ''}`} />
      {apps.length ? (
        <>
          <ul className="launcher" aria-label="Your apps">
            {apps.map((m) => (
              <AppTile key={m.id} m={m} onLongPress={() => setAboutId(m.id)} />
            ))}
            {apps.length < MODULES.length && (
              <li>
                <button className="launcher-tile" onClick={() => navigate('/library')} aria-label="Add apps">
                  <span className="launcher-icon">
                    <span className="app-icon lg add-icon">
                      <Plus />
                    </span>
                  </span>
                  <span className="launcher-name">Add</span>
                </button>
              </li>
            )}
          </ul>
          <p className="footnote">Press and hold an app for options</p>
        </>
      ) : (
        <Empty
          icon={LayoutGrid}
          title="Your Home is empty"
          text="Add the apps you want from the Library."
          action={
            <button className="btn primary" onClick={() => navigate('/library')}>
              Browse Library
            </button>
          }
        />
      )}
      <Sheet open={!!about} onClose={() => setAboutId(null)} title={about?.name ?? ''} hideTitle color={about?.color}>
        {about && <AppDetail m={about} installed={settings.installed.includes(about.id)} onClose={() => setAboutId(null)} />}
      </Sheet>
    </div>
  );
}
