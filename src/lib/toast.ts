import { create } from 'zustand';

export type ToastKind = 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

export const MAX_TOASTS = 3;

interface ToastState {
  toasts: Toast[];
  push: (message: string, kind?: ToastKind) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (message, kind = 'error') =>
    set((s) => {
      if (s.toasts.at(-1)?.message === message) return s;
      return { toasts: [...s.toasts, { id: nextId++, message, kind }].slice(-MAX_TOASTS) };
    }),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const showToast = (message: string, kind: ToastKind = 'error') => useToasts.getState().push(message, kind);
