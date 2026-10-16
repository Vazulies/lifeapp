import { useSyncExternalStore } from 'react';

// Hash router. Entries we push carry { inApp: true, idx }, so "back" knows whether
// there is an in-app page behind the current one, and an app window can pop back
// past its own sub-pages to whatever it was opened from.

interface NavState {
  inApp?: boolean;
  idx?: number;
}

const current = () => location.hash.replace(/^#/, '') || '/';
const navState = () => (history.state as NavState | null) ?? {};

function subscribe(cb: () => void) {
  window.addEventListener('popstate', cb);
  window.addEventListener('hashchange', cb);
  window.addEventListener('routechange', cb);
  return () => {
    window.removeEventListener('popstate', cb);
    window.removeEventListener('hashchange', cb);
    window.removeEventListener('routechange', cb);
  };
}

export const useRoute = () => useSyncExternalStore(subscribe, current);

/** Position of the current entry in this app's own history. */
export const historyIndex = () => navState().idx ?? 0;

/** Whether the current entry was pushed by the app (so there is an app page behind it). */
export const hasInAppPrevious = () => !!navState().inApp;

export function navigate(path: string, { replace = false } = {}) {
  if (path === current()) return;
  if (replace) history.replaceState(navState(), '', '#' + path);
  else history.pushState({ inApp: true, idx: historyIndex() + 1 } satisfies NavState, '', '#' + path);
  window.dispatchEvent(new Event('routechange'));
}

export function goBack(fallback = '/') {
  if (hasInAppPrevious()) history.back();
  else navigate(fallback, { replace: true });
}
