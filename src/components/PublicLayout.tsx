import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useT } from '../i18n';
import { LOCALES, useLocale } from '../lib/locale';
import { paths } from '../lib/paths';
import { ThemeIconButton } from './ShellControls';
import { cx } from './ui';

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-soft font-serif text-lg font-semibold text-accent md:size-10"
    >
      N
    </span>
  );
}

export function LanguageSwitch() {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  return (
    <fieldset className="m-0 flex min-w-0 items-center border-0 p-0 text-xs font-semibold">
      <legend className="sr-only">{t.landing.language}</legend>
      {LOCALES.map((value, i) => (
        <span key={value} className="flex items-center">
          {i > 0 && (
            <span aria-hidden="true" className="text-faint">
              ·
            </span>
          )}
          <button
            type="button"
            lang={value}
            aria-pressed={locale === value}
            onClick={() => setLocale(value)}
            className={cx(
              'min-h-11 min-w-9 rounded-lg px-1.5 transition-colors',
              FOCUS_RING,
              locale === value ? 'text-ink' : 'text-faint hover:text-ink',
            )}
          >
            {value.toUpperCase()}
          </button>
        </span>
      ))}
    </fieldset>
  );
}

/**
 * Pagini publice fără meniul aplicației (juridice, eroare, 404): antet cu marca, limba și
 * „Conectare", conținutul în <main> și subsol. Titlul h1 îl pune copilul.
 */
export function PublicLayout({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  const t = useT();
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-2 px-4 py-3 md:px-8 md:py-5">
        <a
          href={paths.landing}
          aria-label={`${t.appName}, ${t.landing.nav}`}
          className={cx('flex min-w-0 items-center gap-2.5 rounded-lg', FOCUS_RING)}
        >
          <BrandMark />
          <span className="block truncate font-serif text-[17px] leading-tight lowercase">{t.appName}</span>
        </a>
        <div className="flex items-center gap-1 md:gap-3">
          <LanguageSwitch />
          <span className="hidden sm:block">
            <ThemeIconButton />
          </span>
          {nav && (
            <Link
              to={paths.login}
              className={cx(
                'inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-ink hover:underline md:px-3',
                FOCUS_RING,
              )}
            >
              {t.legal.signIn}
            </Link>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-1 px-4 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between md:px-8">
          <p>
            © {new Date().getFullYear()} {t.legal.footer}
          </p>
          <p className="flex flex-wrap items-center gap-x-5">
            <Link to={paths.privacy} className={cx('inline-flex min-h-11 items-center hover:underline', FOCUS_RING)}>
              {t.landing.privacy}
            </Link>
            <Link to={paths.terms} className={cx('inline-flex min-h-11 items-center hover:underline', FOCUS_RING)}>
              {t.landing.terms}
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
