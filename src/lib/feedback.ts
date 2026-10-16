import { useSyncExternalStore } from 'react';
import { getValue } from './store';

// Haptics, toasts and confirmation dialogs. In-memory only; nothing persisted.

export function haptic(pattern: number | number[] = 10) {
  if (getValue<{ haptics?: boolean }>('settings', {}).haptics === false) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported (e.g. iOS Safari).
  }
}

export interface Toast {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}

export interface Question {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
}

let toasts: Toast[] = [];
let question: (Question & { resolve: (ok: boolean) => void }) | null = null;
let seq = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};

export function toast(message: string, action?: Toast['action']) {
  const id = ++seq;
  toasts = [...toasts.slice(-1), { id, message, action }];
  emit();
  setTimeout(() => dismissToast(id), action ? 5000 : 2600);
}

export function dismissToast(id: number) {
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export const useToasts = () => useSyncExternalStore(subscribe, () => toasts);

/** In-app replacement for window.confirm. */
export function ask(q: Question) {
  return new Promise<boolean>((resolve) => {
    question?.resolve(false);
    question = { ...q, resolve };
    emit();
  });
}

export function answer(ok: boolean) {
  const q = question;
  question = null;
  emit();
  q?.resolve(ok);
}

export const useQuestion = () => useSyncExternalStore(subscribe, () => question);

/** Remove one item from a stored list and offer to put it back where it was. */
export function removeWithUndo<T>(set: (u: (prev: T[]) => T[]) => void, isTarget: (x: T) => boolean, message: string) {
  let removed: { item: T; index: number } | undefined;
  set((prev) => {
    const index = prev.findIndex(isTarget);
    if (index < 0) return prev;
    removed = { item: prev[index], index };
    return prev.filter((_, i) => i !== index);
  });
  if (!removed) return;
  const { item, index } = removed;
  haptic();
  toast(message, {
    label: 'Undo',
    run: () =>
      set((prev) => {
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, item);
        return next;
      }),
  });
}
