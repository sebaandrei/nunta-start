import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import { type Toast, useToasts } from '../lib/toast';

const AUTO_DISMISS_MS = 6000;

function ToastItem({ toast }: { toast: Toast }) {
  const t = useT();
  const dismiss = useToasts((s) => s.dismiss);
  const [paused, setPaused] = useState(false);
  const persistent = toast.kind === 'error';

  useEffect(() => {
    if (persistent || paused) return;
    const timer = setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [persistent, paused, toast.id, dismiss]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: handlers only pause the auto-dismiss timer; the dismiss button is the control
    <div
      role={persistent ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-warm-line bg-warm-card px-4 py-3 text-sm font-semibold text-danger shadow-lg"
    >
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        className="rounded-lg px-2 py-1 text-danger hover:opacity-80"
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
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
