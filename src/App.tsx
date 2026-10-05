import { Link, Outlet } from '@tanstack/react-router';
import { Banner } from './components/ui';
import { daysBetween, parseISODate } from './domain/dates';
import { formatDate } from './lib/format';
import { useToday } from './lib/useToday';
import { Onboarding } from './screens/Onboarding';
import { useAppData, useStore } from './store';
import { t } from './text';

const TABS = [
  { id: 'acasa', to: '/' },
  { id: 'start', to: '/start' },
  { id: 'calculator', to: '/calculator' },
  { id: 'setari', to: '/settings' },
] as const;

export function App() {
  const hasData = useStore((s) => s.data !== null);
  const storageStatus = useStore((s) => s.storageStatus);

  return (
    <>
      {storageStatus === 'unavailable' && (
        <div className="mx-auto max-w-5xl px-4 pt-4">
          <Banner tone="warn">{t.storage.unavailable}</Banner>
        </div>
      )}
      {hasData ? <Shell /> : <Onboarding />}
    </>
  );
}

function Shell() {
  const data = useAppData();
  const today = useToday();
  const wedding = parseISODate(data.settings.weddingDate);
  const [name1, name2] = data.settings.names;

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line py-5">
        <div>
          <h1 className="font-serif text-2xl leading-tight">{t.header.couple(name1, name2)}</h1>
          <p className="mt-0.5 text-sm text-muted">
            {formatDate(wedding)} · {t.header.countdown(daysBetween(today, wedding))}
          </p>
        </div>
        <nav className="-mx-1 flex gap-1 overflow-x-auto" aria-label={t.appName}>
          {TABS.map(({ id, to }) => (
            <Link
              key={id}
              to={to}
              activeOptions={{ exact: true }}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:text-ink"
              activeProps={{ className: 'bg-sunken font-semibold text-ink', 'aria-current': 'page' }}
            >
              {t.tabs[id]}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-line py-4 text-xs text-faint">
        {t.appName} · {t.footer}
      </footer>
    </div>
  );
}
