import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import { BrandMark, LanguageSwitch } from '../components/PublicLayout';
import { ThemeIconButton } from '../components/ShellControls';
import { cx } from '../components/ui';
import { useT } from '../i18n';
import { paths, signUpPath } from '../lib/paths';
import { useSession } from '../lib/session';

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const LABEL = 'text-[11px] font-semibold uppercase tracking-[0.1em]';

/** Pagina publică: fără meniul aplicației, la `/`. */
export function Landing() {
  const t = useT();
  const hasData = useSession((s) => s.status === 'signedIn');
  const ctaPath = hasData ? paths.workspaces : signUpPath;
  const ctaLabel = hasData ? t.landing.ctaOpen : t.landing.cta;

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 px-4 py-3 md:px-8 md:py-5">
        <a
          href={paths.landing}
          aria-label={`${t.appName}, ${t.landing.nav}`}
          className={cx('flex min-w-0 items-center gap-2.5 rounded-lg', FOCUS_RING)}
        >
          <BrandMark />
          <span className="min-w-0">
            <span className="block truncate font-serif text-[17px] leading-tight lowercase">{t.appName}</span>
            <span className={'hidden text-[9px] font-semibold uppercase tracking-[0.1em] text-muted md:block'}>
              {t.landing.tagline}
            </span>
          </span>
        </a>
        <div className="flex items-center gap-1 md:gap-3">
          <LanguageSwitch />
          <span className="hidden sm:block">
            <ThemeIconButton />
          </span>
          <Link
            to={paths.login}
            className={cx(
              'inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-ink hover:underline md:px-3',
              !hasData && 'md:hidden',
              FOCUS_RING,
            )}
          >
            {t.landing.signIn}
          </Link>
          <a
            href={ctaPath}
            className={cx(
              'hidden min-h-11 items-center rounded-xl bg-accent-solid px-5 text-sm font-semibold text-on-accent hover:opacity-90 md:inline-flex',
              FOCUS_RING,
            )}
          >
            {hasData ? t.landing.ctaOpen : t.landing.start}
          </a>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute -left-48 -top-24 -z-10 size-[560px] rounded-full bg-warm/50 md:-left-32 md:size-[680px]"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-40 -right-40 -z-10 size-[420px] rounded-full bg-soft/70 md:-right-24 md:bottom-0 md:size-[520px]"
          />
          <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 py-10 md:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16 lg:py-16">
            <div>
              <p className={cx('mb-4 text-muted', LABEL)}>{t.landing.eyebrow}</p>
              <h1 className="font-serif text-[2.25rem] font-medium leading-[1.1] text-balance md:text-[3.25rem] lg:text-[3.5rem]">
                {t.landing.headline1} <span className="md:block">{t.landing.headline2}</span>
              </h1>
              <p className="mt-6 max-w-md text-base leading-relaxed md:text-lg">{t.landing.lead}</p>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted md:text-base">{t.landing.body}</p>
              <a
                href={ctaPath}
                className={cx(
                  'mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-accent-solid px-6 text-sm font-semibold text-on-accent hover:opacity-90 sm:w-auto',
                  FOCUS_RING,
                )}
              >
                {ctaLabel}
              </a>
              {!hasData && <p className="mt-3 text-xs text-muted">{t.landing.reassurance}</p>}
              <p className={cx('mt-6 text-faint', LABEL, 'text-[10px]')}>{t.landing.motto}</p>
            </div>
            <PlannerPreview />
          </div>
        </section>

        <section aria-labelledby="landing-features" className="mx-auto max-w-[1200px] px-4 pb-10 md:px-8 md:pb-14">
          <div className="rounded-2xl border border-line bg-surface p-5 md:p-8">
            <h2 id="landing-features" className={cx('text-muted', LABEL)}>
              {t.landing.featuresTitle}
            </h2>
            <ol className="mt-5 grid gap-5 md:grid-cols-3 md:gap-0">
              {t.landing.features.map((feature, i) => (
                <li
                  key={feature.title}
                  className={cx('flex gap-4 md:block md:px-8', i === 0 ? 'md:pl-0' : 'md:border-l md:border-line')}
                >
                  <span className="font-serif text-sm text-accent">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="font-serif text-lg font-medium leading-snug md:mt-2">{feature.title}</h3>
                    <p className="mt-1 text-sm text-muted">{feature.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-6 text-xs text-muted md:flex-row md:items-center md:justify-between md:px-8">
          <p>{t.landing.footerPrivacy}</p>
          <p className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span>
              {t.landing.haveAccount}{' '}
              <Link
                to={paths.login}
                className={cx(
                  'inline-flex min-h-11 items-center font-medium text-ink underline md:min-h-0',
                  FOCUS_RING,
                )}
              >
                {t.landing.haveAccountLink}
              </Link>
            </span>
            <Link
              to={paths.privacy}
              className={cx('inline-flex min-h-11 items-center hover:underline md:min-h-0', FOCUS_RING)}
            >
              {t.landing.privacy}
            </Link>
            <Link
              to={paths.terms}
              className={cx('inline-flex min-h-11 items-center hover:underline md:min-h-0', FOCUS_RING)}
            >
              {t.landing.terms}
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Miniatură decorativă a ecranului Acasă: date de exemplu, fără legătură cu datele reale. */
function PlannerPreview() {
  const t = useT();
  const p = t.landing.preview;
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-line px-5 py-3 text-xs font-semibold">
        <span className="flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-lg bg-soft font-serif text-xs text-accent">
            N
          </span>
          {p.brand}
        </span>
        <span className="text-muted">{p.date}</span>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="font-serif text-xl font-medium leading-snug">{p.greeting}</p>
          <p className="mt-0.5 text-xs text-muted">{p.untilWedding}</p>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl bg-hero p-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">{p.countdownEyebrow}</p>
            <div className="mt-3 h-1.5 w-32 max-w-full rounded-full bg-soft">
              <div className="h-full w-[64%] rounded-full bg-progress" />
            </div>
          </div>
          <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-full bg-soft">
            <span className="font-serif text-2xl leading-none">110</span>
            <span className="text-[9px] font-medium text-muted">{p.days}</span>
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-semibold">{p.next}</p>
            <p className="text-[10px] text-muted">{p.progress}</p>
          </div>
          <ul className="mt-2 divide-y divide-line">
            {p.tasks.map((task) => (
              <li key={task.title} className="flex items-center gap-3 py-2.5">
                <span
                  className={cx(
                    'inline-flex size-5 shrink-0 items-center justify-center rounded-full',
                    task.done ? 'bg-accent-solid text-on-accent' : 'border border-line text-faint',
                  )}
                >
                  {task.done && <Check size={12} />}
                </span>
                <span className="min-w-0 flex-1 text-[13px] font-medium">{task.title}</span>
                <span className="text-[10px] text-muted">{task.due}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
