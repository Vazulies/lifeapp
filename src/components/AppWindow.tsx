import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AppWindowContext, type AppWindowApi } from './appContext';
import { AppDetail } from './AppDetail';
import { accent, AppIcon, Sheet } from './ui';
import { haptic } from '../lib/feedback';
import { takeOrigin } from '../lib/launcher';
import { hasInAppPrevious, historyIndex, navigate } from '../lib/router';
import { useSettings } from '../lib/settings';
import type { AppModule } from '../modules/registry';

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A full-screen window an app runs in, opened over Home or the Library. */
export function AppWindow({ mod, param, base }: { mod: AppModule; param?: string; base: string }) {
  const [{ installed }] = useSettings();
  const [closing, setClosing] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const origin = useMemo(() => takeOrigin(), []);
  // Where this window's history starts, so closing skips its sub-pages too.
  const opened = useRef({ idx: historyIndex(), inApp: hasInAppPrevious() });
  const done = useRef(false);

  useEffect(() => {
    document.body.classList.add('app-open');
    return () => document.body.classList.remove('app-open');
  }, []);

  const api = useMemo<AppWindowApi>(() => {
    const finish = () => {
      if (done.current) return;
      done.current = true;
      if (opened.current.inApp) history.go(opened.current.idx - 1 - historyIndex());
      else navigate(base, { replace: true });
    };
    return {
      meta: mod,
      showAbout: () => setAboutOpen(true),
      close: () => {
        haptic(6);
        if (reducedMotion()) return finish();
        setClosing(true);
        setTimeout(finish, 240);
      },
    };
  }, [mod, base]);

  const style = {
    ...accent(mod.color),
    '--ox': origin ? `${origin.x}px` : '50%',
    '--oy': origin ? `${origin.y}px` : '50%',
  } as CSSProperties;

  return (
    <AppWindowContext.Provider value={api}>
      <div className={`app-window${closing ? ' closing' : ''}${origin ? ' from-icon' : ''}`} style={style} role="main" aria-label={mod.name}>
        <div className="app-window-body">
          <mod.Screen param={param} />
        </div>
        <div className="app-splash" aria-hidden>
          <AppIcon meta={mod} size="xl" />
          <span>{mod.name}</span>
        </div>
      </div>
      <Sheet open={aboutOpen} onClose={() => setAboutOpen(false)} title={`About ${mod.name}`} hideTitle color={mod.color}>
        <AppDetail m={mod} installed={installed.includes(mod.id)} onClose={() => setAboutOpen(false)} inApp />
      </Sheet>
    </AppWindowContext.Provider>
  );
}
