import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useParams, useRouterState } from '@tanstack/react-router';
import { ArrowLeftRight, Calculator, House, ListChecks, type LucideIcon, Settings, ShieldCheck } from 'lucide-react';
import { LocaleIconButton, SignOutButton, SignOutIconButton, ThemeIconButton } from './components/ShellControls';
import { cx } from './components/ui';
import { useTasks } from './data/hooks';
import { weddingsQuery } from './data/queries';
import { parseISODate } from './domain/dates';
import { useT } from './i18n';
import { formatDate } from './lib/format';
import { paths } from './lib/paths';
import { coupleInitials, NAV_ITEMS, type NavId, navIdForPath, recoverBadgeCount } from './lib/shell';
import { useToday } from './lib/useToday';
import { useWedding, WeddingProvider } from './lib/wedding';

const NAV_ICONS: Record<NavId, LucideIcon> = {
  home: House,
  tasks: ListChecks,
  budget: Calculator,
  settings: Settings,
};

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/** Meniul și ecranele unei nunți; nunta (și rolul meu) vin din `WeddingProvider`. */
export function App() {
  const { weddingId } = useParams({ strict: false });
  return (
    <WeddingProvider weddingId={weddingId ?? ''}>
      <Shell />
    </WeddingProvider>
  );
}

function Shell() {
  const t = useT();

  return (
    <div className="min-h-dvh md:pl-[244px]">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t.shell.skip}
      </a>
      <Sidebar />
      <MobileTopBar />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto max-w-[1120px] px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] outline-none md:px-10 md:pt-8 md:pb-12"
      >
        <Outlet />
      </main>
      <MobileTabBar />
    </div>
  );
}

function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-xl bg-accent font-serif font-semibold text-accent-ink',
        className,
      )}
    >
      N
    </span>
  );
}

function Sidebar() {
  const t = useT();
  const { id, wedding: row } = useWedding();
  const tasks = useTasks(id);
  const today = useToday();
  const wedding = row.date ? parseISODate(row.date) : null;
  const names: [string, string] = [row.partner1, row.partner2];
  const badge = wedding ? recoverBadgeCount(tasks, wedding, today) : 0;

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[244px] flex-col gap-6 overflow-y-auto border-r border-line bg-sunken px-4 py-6 md:flex">
      <div className="flex items-center gap-3 px-2">
        <BrandMark className="size-10 text-xl" />
        <div className="min-w-0">
          <p className="font-serif text-[17px] leading-tight lowercase">{t.appName}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{t.shell.caption}</p>
        </div>
      </div>

      <nav aria-label={t.shell.mainNav} className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{t.shell.section}</p>
        {NAV_ITEMS.map(({ id: navId, to }) => {
          const Icon = NAV_ICONS[navId];
          return (
            <Link
              key={navId}
              to={to}
              params={{ weddingId: id }}
              activeOptions={{ exact: true }}
              className={cx(
                'flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-muted transition-colors hover:bg-soft/60 hover:text-ink',
                FOCUS_RING,
              )}
              activeProps={{ className: 'bg-soft font-semibold text-ink', 'aria-current': 'page' }}
            >
              <Icon size={18} aria-hidden="true" />
              <span className="flex-1">{t.shell.nav[navId]}</span>
              {navId === 'tasks' && badge > 0 && (
                <span
                  role="img"
                  aria-label={t.shell.badgeLabel(badge)}
                  className="min-w-5 rounded-full bg-accent px-1.5 text-center text-[11px] font-semibold leading-5 text-accent-ink"
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <hr className="border-line" />

      <section aria-label={t.shell.coupleLabel} className="px-2">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{t.shell.coupleLabel}</p>
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-soft text-[11px] font-semibold"
          >
            {coupleInitials(names)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">{t.header.couple(...names)}</p>
            {wedding && <p className="text-[11px] text-muted">{formatDate(wedding)}</p>}
          </div>
        </div>
        <SwitchWedding className="mt-3 -ml-2" />
      </section>

      <div className="mt-auto rounded-xl bg-hero p-3.5">
        <p className="flex items-center gap-2 text-xs font-semibold">
          <ShieldCheck size={16} aria-hidden="true" className="shrink-0 text-accent" />
          {t.shell.privacyTitle}
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{t.shell.privacyBody}</p>
      </div>
      <SignOutButton />
    </aside>
  );
}

function MobileTopBar() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-bg px-4 md:hidden">
      <BrandMark className="size-8 text-base" />
      <p className="min-w-0 flex-1 truncate font-serif text-lg">{t.shell.tab[navIdForPath(pathname)]}</p>
      <SwitchWedding icon />
      <ThemeIconButton />
      <LocaleIconButton />
      <SignOutIconButton />
    </div>
  );
}

/** Trecerea la altă nuntă: apare doar când omul are mai multe (altfel `/w` l-ar duce înapoi în aceeași). */
function SwitchWedding({ icon = false, className }: { icon?: boolean; className?: string }) {
  const t = useT();
  const { data } = useQuery(weddingsQuery());
  if (!data || data.length < 2) return null;
  return (
    <Link
      to={paths.workspaces}
      search={{ all: true }}
      aria-label={icon ? t.shell.switchWedding : undefined}
      title={icon ? t.shell.switchWedding : undefined}
      className={cx(
        icon
          ? 'inline-flex size-11 items-center justify-center rounded-lg text-muted hover:text-ink'
          : 'inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-[13px] font-medium text-muted hover:text-ink',
        FOCUS_RING,
        className,
      )}
    >
      <ArrowLeftRight size={icon ? 20 : 16} aria-hidden="true" />
      {!icon && t.shell.switchWedding}
    </Link>
  );
}

function MobileTabBar() {
  const t = useT();
  const { id: weddingId } = useWedding();
  return (
    <nav
      aria-label={t.shell.mainNav}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ id, to }) => {
          const Icon = NAV_ICONS[id];
          return (
            <li key={id}>
              <Link
                to={to}
                params={{ weddingId }}
                activeOptions={{ exact: true }}
                className={cx(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] text-muted transition-colors',
                  FOCUS_RING,
                )}
                activeProps={{ className: 'font-semibold text-accent', 'aria-current': 'page' }}
              >
                <Icon size={22} aria-hidden="true" />
                {t.shell.tab[id]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
