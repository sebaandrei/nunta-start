import { useEffect } from 'react';
import { useT } from '../i18n';
import { type Toast, useToasts } from '../lib/toast';

const AUTO_DISMISS_MS = 6000;

function ToastItem({ toast }: { toast: Toast }) {
  const t = useT();
  const dismiss = useToasts((s) => s.dismiss);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, dismiss]);

  return (
    <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-minus/30 bg-surface px-4 py-3 text-sm text-ink shadow-lg">
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        className="rounded-lg px-2 py-1 text-muted hover:text-ink"
        aria-label={t.toast.dismiss}
      >
        ×
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
