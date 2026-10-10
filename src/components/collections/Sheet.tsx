import { type ReactNode, useEffect, useId, useRef } from 'react';

/**
 * Foaie de jos pe telefon, dialog centrat pe desktop, pe <dialog> nativ (focus, Escape, click pe fundal).
 * Conținutul se montează doar cât e deschisă, deci formularele pornesc de fiecare dată de la zero.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes the native dialog.
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-0 mt-auto max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40 md:m-auto md:max-w-xl md:rounded-2xl"
    >
      {open && (
        <div className="p-4 pb-6 md:p-6">
          <h2 id={titleId} className="font-serif text-xl leading-snug">
            {title}
          </h2>
          {children}
        </div>
      )}
    </dialog>
  );
}
