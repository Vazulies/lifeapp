import { useEffect, useLayoutEffect, useRef } from 'react';
import { CircleHelp, House, LayoutGrid, Settings as SettingsIcon } from 'lucide-react';
import { navigate, useRoute } from './lib/router';
import { useSettings } from './lib/settings';
import { haptic } from './lib/feedback';
import { moduleById } from './modules/registry';
import { FocusEngine } from './modules/Focus';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { Settings } from './pages/Settings';
import { Onboarding } from './pages/Onboarding';
import { Overlays } from './components/Overlays';
import { AppWindow } from './components/AppWindow';
import { Empty, Page } from './components/ui';

const TABS = [
  { path: '/', label: 'Home', icon: House },
  { path: '/library', label: 'Library', icon: LayoutGrid },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

const THEME_COLOR = { light: '#F3F3F1', dark: '#0B0B0B' };

function useTheme(theme: 'system' | 'light' | 'dark') {
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
    // Keep the browser chrome in step with an explicit theme choice.
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
      const scheme = m.media.includes('dark') ? 'dark' : 'light';
      m.content = THEME_COLOR[theme === 'system' ? scheme : theme];
    });
  }, [theme]);
}

function Shell() {
  const route = useRoute();
  const [, section, id, param] = route.split('/');
  const mod = section === 'm' ? moduleById(id) : undefined;

  // The page an app window opens over (and returns to): the last non-app route.
  const lastBase = useRef('/');
  if (!mod) lastBase.current = route === '/apps' ? '/library' : route;
  const base = lastBase.current;

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [base]);

  let content;
  if (base === '/') content = <Home />;
  else if (base === '/library') content = <Library />;
  else if (base === '/settings') content = <Settings />;
  else
    content = (
      <Page title="Not found">
        <Empty icon={CircleHelp} title="This page doesn't exist" />
      </Page>
    );

  return (
    <>
      <div className="app" inert={!!mod}>
        <main className="main" key={base}>
          {content}
        </main>
        <nav className="tabbar" aria-label="Main">
          {TABS.map(({ path, label, icon: Icon }) => {
            const active = base === path;
            return (
              <button
                key={path}
                className={`tab${active ? ' active' : ''}`}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                onClick={() => {
                  if (!active) haptic(6);
                  navigate(path, { replace: active });
                }}
              >
                <Icon size={20} />
                <span className="tab-label">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      {mod && <AppWindow key={mod.id} mod={mod} param={param} base={base} />}
    </>
  );
}

export default function App() {
  const [settings] = useSettings();
  useTheme(settings.theme);
  return (
    <>
      {settings.onboarded ? <Shell /> : <Onboarding />}
      <FocusEngine />
      <Overlays />
    </>
  );
}
