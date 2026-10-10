import { Link } from '@tanstack/react-router';
import { ArrowLeft, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { useT } from '../../i18n';
import { LocaleSegmented, ThemeIconButton } from '../ShellControls';

function BackLink({ className }: { className: string }) {
  const t = useT();
  return (
    <Link
      to="/"
      className={`${className} min-h-11 items-center gap-2 rounded-lg text-[13px] font-medium text-muted hover:text-ink`}
    >
      <ArrowLeft size={16} aria-hidden="true" />
      {t.auth.panel.back}
    </Link>
  );
}

function Trust({ title, hint }: { title: string; hint: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-soft text-accent"
      >
        <Check size={13} strokeWidth={3} />
      </span>
      <span>
        <span className="block text-[13px] font-semibold">{title}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </li>
  );
}

/** Ecran împărțit: panou verde cu marca la stânga (sus, compact, pe telefon), cardul la dreapta. */
export function AuthLayout({ children }: { children: ReactNode }) {
  const t = useT();
  const p = t.auth.panel;
  return (
    <div className="grid min-h-dvh grid-cols-1 overflow-x-clip md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="relative isolate overflow-hidden bg-hero md:min-h-dvh">
        {/* Cercul decorativ: iese din panou pe jos și nu atinge conținutul. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -bottom-20 -z-10 size-48 rounded-full bg-warm md:-bottom-32 md:right-auto md:-left-24 md:size-[22rem]"
        />
        <div className="flex h-full flex-col gap-6 px-4 pt-5 pb-6 md:gap-10 md:px-12 md:py-10 lg:px-16">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-solid font-serif text-xl font-semibold text-on-accent"
              >
                N
              </span>
              <div className="min-w-0">
                <p className="font-sans text-[17px] leading-tight font-semibold lowercase">{t.appName}</p>
                <p className="hidden text-[10px] font-semibold uppercase tracking-[0.1em] text-muted md:block">
                  {p.eyebrow}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:hidden">
              <ThemeIconButton />
              <LocaleSegmented />
            </div>
          </div>

          <div className="md:mt-auto">
            <p className="font-serif text-[2rem] leading-[1.1] font-medium tracking-tight md:text-5xl">
              {p.line1}
              <br />
              {p.line2}
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted md:mt-5 md:text-[15px]">{p.intro}</p>
            <ul className="mt-8 hidden flex-col gap-4 md:flex">
              <Trust title={p.stepsTitle} hint={p.stepsHint} />
              <Trust title={p.budgetTitle} hint={p.budgetHint} />
            </ul>
          </div>

          <div className="mt-auto hidden flex-col gap-2 md:mt-0 md:flex">
            <p className="text-[11px] text-muted">{p.note}</p>
            <BackLink className="flex" />
          </div>
        </div>
      </div>

      <div className="flex flex-col px-4 pt-4 pb-8 md:px-10 md:py-8">
        <div className="hidden items-center justify-end gap-1 md:flex">
          <LocaleSegmented />
          <ThemeIconButton />
        </div>
        <main id="main" className="flex flex-1 items-start justify-center py-6 md:items-center md:py-10">
          <div className="w-full max-w-[28rem]">{children}</div>
        </main>
        <BackLink className="flex self-center md:hidden" />
      </div>
    </div>
  );
}
