import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useT } from '../i18n';
import { LocaleSegmented, ThemeIconButton } from './ShellControls';

export const LINK_FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/** Clase pentru un <Link> care arată ca un buton (aceleași măsuri ca Button din ui.tsx). */
export const LINK_BUTTON = `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 py-1.5 text-sm font-medium transition-colors md:min-h-9 md:px-3.5 ${LINK_FOCUS}`;
export const LINK_BUTTON_PRIMARY = `${LINK_BUTTON} bg-accent text-accent-ink hover:opacity-90`;
export const LINK_BUTTON_GHOST = `${LINK_BUTTON} border border-line bg-surface text-ink hover:bg-sunken`;

/** Pagină publică fără meniul aplicației: antet cu marca, limba și tema, apoi conținutul centrat. */
export function PublicShell({ headerAction, children }: { headerAction?: ReactNode; children: ReactNode }) {
  const t = useT();
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <header className="flex items-center justify-between gap-3 px-4 py-4 md:px-10 md:py-5">
        <Link to="/" className={`flex min-h-11 items-center gap-3 rounded-lg ${LINK_FOCUS}`}>
          <span
            aria-hidden="true"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent font-serif text-lg font-semibold text-accent-ink"
          >
            N
          </span>
          <span className="font-sans text-[17px] leading-tight font-semibold lowercase">{t.appName}</span>
        </Link>
        <div className="flex items-center gap-1 md:gap-3">
          <LocaleSegmented />
          <ThemeIconButton />
          {headerAction}
        </div>
      </header>
      <main id="main" className="flex flex-1 justify-center px-4 pt-4 pb-10 md:items-center md:pt-2 md:pb-16">
        {children}
      </main>
    </div>
  );
}
