import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { TaskRow } from '../components/TaskRow';
import { Banner, Button, Card, cx, ProgressBar } from '../components/ui';
import { hasPrices, selectedGuests, summarizePayments, summarizeScenario } from '../domain/budget';
import { parseISODate } from '../domain/dates';
import { isRecover, nextTasks, openInCurrentStage, progress } from '../domain/tasks';
import { useT } from '../i18n';
import { downloadBackup } from '../lib/backup';
import { formatMoney, formatSignedMoney } from '../lib/format';
import { dayPart } from '../lib/shell';
import { useToday } from '../lib/useToday';
import { daysSinceBackup, needsBackupReminder } from '../storage/storage';
import { useAppData, useStore } from '../store';

export function Home() {
  const t = useT();
  const data = useAppData();
  const markExported = useStore((s) => s.markExported);
  const today = useToday();
  const [openId, setOpenId] = useState<string | null>(null);

  const { settings, budget, tasks } = data;
  const wedding = parseISODate(settings.weddingDate);
  const rates = { eurRate: settings.eurRate, currency: settings.displayCurrency };
  const cur = settings.displayCurrency;

  const { done, total } = progress(tasks);
  const recoverCount = tasks.filter((task) => isRecover(task, wedding, today)).length;
  const currentCount = openInCurrentStage(tasks, wedding, today);
  const next = nextTasks(tasks, wedding, today, 5);

  const guests = selectedGuests(budget);
  const scenario = summarizeScenario(budget, guests, rates);
  const payments = summarizePayments(budget, guests, rates);
  const pricesFilled = hasPrices(budget);
  const giftMissing = budget.giftPerGuest.amount === null;

  const now = new Date();
  const showReminder = needsBackupReminder(data.meta, now);

  return (
    <>
      <PageHeader
        title={`${t.greeting[dayPart(now.getHours())]}, ${t.header.couple(...settings.names)}`}
        subtitle={t.pages.home.subtitle}
      />
      <div className="space-y-5">
        {showReminder && (
          <Banner>
            <span>{t.storage.reminder(daysSinceBackup(data.meta, now))}</span>
            <Button variant="ghost" onClick={() => downloadBackup(data, markExported)}>
              {t.storage.reminderAction}
            </Button>
          </Banner>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label={t.home.tasks}>
            <p className="text-2xl font-semibold tabular-nums">{t.home.tasksDone(done, total)}</p>
            <ProgressBar className="my-2" label={t.home.tasks} value={done} max={total} />
            <p className="text-xs text-muted">{t.home.tasksDetail(recoverCount, currentCount)}</p>
          </Stat>

          <Stat label={giftMissing ? t.home.cost(guests) : t.home.balance(guests)}>
            {!pricesFilled ? (
              <>
                <p className="text-2xl font-semibold text-faint">—</p>
                <p className="mt-2 text-xs text-muted">
                  {t.home.needPrices}{' '}
                  <Link className="text-accent underline-offset-2 hover:underline" to="/calculator">
                    {t.home.goCalculator}
                  </Link>
                </p>
              </>
            ) : giftMissing ? (
              <>
                <p className="text-2xl font-semibold tabular-nums">{formatMoney(scenario.total, cur)}</p>
                <p className="mt-2 text-xs text-muted">{t.home.needGift}</p>
              </>
            ) : (
              <>
                <p
                  className={cx(
                    'text-2xl font-semibold tabular-nums',
                    scenario.balance >= 0 ? 'text-plus' : 'text-minus',
                  )}
                >
                  {formatSignedMoney(scenario.balance, cur)}
                </p>
                <p className="mt-2 text-xs text-muted">{t.home.breakEven(formatMoney(scenario.breakEvenGift, cur))}</p>
              </>
            )}
          </Stat>

          <Stat label={t.home.payments}>
            <p className="text-2xl font-semibold tabular-nums">{formatMoney(payments.paid, cur)}</p>
            <p className="mt-2 text-xs text-muted">
              {t.home.paidOf(formatMoney(payments.total, cur), formatMoney(payments.remaining, cur))}
            </p>
          </Stat>
        </div>

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-baseline justify-between gap-2 bg-sunken/60 px-4 py-2.5">
            <h2 className="text-sm font-semibold">{t.home.next}</h2>
            <span className="text-xs text-muted">{t.home.nextHint}</span>
          </div>
          {next.length ? (
            <ul>
              {next.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  wedding={wedding}
                  today={today}
                  names={settings.names}
                  recover={isRecover(task, wedding, today)}
                  expanded={openId === task.id}
                  onToggle={() => setOpenId((id) => (id === task.id ? null : task.id))}
                />
              ))}
            </ul>
          ) : (
            <p className="px-4 py-4 text-sm text-muted">{t.home.allDone}</p>
          )}
          <div className="border-t border-line px-4 py-2.5 text-right">
            <Link className="text-sm text-accent underline-offset-2 hover:underline" to="/start">
              {t.home.goStart}
              <ArrowRight size={14} aria-hidden="true" className="ml-1 inline" />
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card className="px-4 py-3.5">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      {children}
    </Card>
  );
}
