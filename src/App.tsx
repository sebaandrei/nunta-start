import { useEffect, useState } from 'react';
import { Banner, cx } from './components/ui';
import { daysBetween, parseISODate } from './domain/dates';
import { formatDate } from './lib/format';
import { useToday } from './lib/useToday';
import { Calculator } from './screens/Calculator';
import { Home } from './screens/Home';
import { Onboarding } from './screens/Onboarding';
import { Settings } from './screens/Settings';
import { Start } from './screens/Start';
import { useAppData, useStore } from './store';
import { t } from './text';

const TABS = ['acasa', 'start', 'calculator', 'setari'] as const;
type Tab = (typeof TABS)[number];

function readTab(): Tab {
  const hash = window.location.hash.replace('#', '');
  return (TABS as readonly string[]).includes(hash) ? (hash as Tab) : 'acasa';
}

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
  const [tab, setTab] = useState<Tab>(readTab);

  useEffect(() => {
    const onHash = () => {
      setTab(readTab());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

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
          {TABS.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={tab === id ? 'page' : undefined}
              className={cx(
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors',
                tab === id ? 'bg-sunken font-semibold text-ink' : 'text-muted hover:text-ink',
              )}
            >
              {t.tabs[id]}
            </a>
          ))}
        </nav>
      </header>

      <main className="flex-1 py-6">
        {tab === 'acasa' && <Home />}
        {tab === 'start' && <Start />}
        {tab === 'calculator' && <Calculator />}
        {tab === 'setari' && <Settings />}
      </main>

      <footer className="border-t border-line py-4 text-xs text-faint">
        {t.appName} · {t.footer}
      </footer>
    </div>
  );
}
