import { useSyncExternalStore } from 'react';

// Captures the browser's install prompt so Settings can offer "Install app".

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as BeforeInstallPromptEvent;
  emit();
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  emit();
});

export const useCanInstall = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    () => !!deferred,
  );

export async function promptInstall() {
  const d = deferred;
  if (!d) return;
  deferred = null;
  emit();
  await d.prompt();
}
