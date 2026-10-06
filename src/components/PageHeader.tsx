import type { ReactNode } from 'react';
import { useT } from '../i18n';
import { formatLongDate } from '../lib/format';
import { useToday } from '../lib/useToday';
import { LocaleSegmented, ThemeSegmented } from './ShellControls';

/**
 * Antetul unui ecran: data (sau altă etichetă), titlul serif, subtitlul și, pe desktop,
 * comutatoarele de temă și limbă. Pe telefon acestea stau în bara de sus.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  /** Implicit data de azi, în limba activă. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Butonul principal al ecranului. */
  action?: ReactNode;
}) {
  useT(); // redesenare la schimbarea limbii (data)
  const today = useToday();
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-4 md:mb-8">
      <div className="min-w-0 basis-72 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          {eyebrow ?? formatLongDate(today)}
        </p>
        <h1 className="mt-1.5 text-balance font-serif text-[1.75rem] leading-tight md:text-[2rem]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted md:text-base">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="hidden items-center gap-2 md:flex">
          <ThemeSegmented />
          <LocaleSegmented />
        </div>
        {action}
      </div>
    </header>
  );
}
