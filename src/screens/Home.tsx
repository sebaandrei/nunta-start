import { Link } from '@tanstack/react-router';
import { ArrowRight, Circle, CircleCheck, CircleDot, Heart, PartyPopper } from 'lucide-react';
import type { ReactNode } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, cx, EmptyState, Heading, ProgressBar, StatCard } from '../components/ui';
import { useWeddingAppData } from '../data/hooks';
import { type TaskActions, useTaskActions } from '../data/taskActions';
import { hasPrices, selectedGuests, summarizePayments, summarizeScenario } from '../domain/budget';
import { parseISODate } from '../domain/dates';
import { capitalize, countdown, paidPercent, withCity } from '../domain/home';
import type { Task } from '../domain/schema';
import { dueDate, isOverdue, isRecover, nextTasks, openInCurrentStage, progress, stageOf } from '../domain/tasks';
import { useT } from '../i18n';
import { formatLongDate, formatMoney, formatShortDate, formatSignedMoney } from '../lib/format';
import { routes } from '../lib/paths';
import { dayPart } from '../lib/shell';
import { useToday } from '../lib/useToday';
import { useWedding } from '../lib/wedding';

const LINK = 'inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold hover:underline md:min-h-0';

export function Home() {
  const t = useT();
  const data = useWeddingAppData();
  const { id: weddingId, canEdit } = useWedding();
  const actions = useTaskActions(weddingId);
  const today = useToday();

  const { settings, budget, tasks } = data;
  const wedding = parseISODate(settings.weddingDate);
  const rates = { eurRate: settings.eurRate, currency: settings.displayCurrency };
  const cur = settings.displayCurrency;

  const { done, total } = progress(tasks);
  const recoverCount = tasks.filter((task) => isRecover(task, wedding, today)).length;
  const currentCount = openInCurrentStage(tasks, wedding, today);
  const next = nextTasks(tasks, wedding, today, 4);

  const guests = selectedGuests(budget);
  const scenario = summarizeScenario(budget, guests, rates);
  const payments = summarizePayments(budget, guests, rates);
  const pricesFilled = hasPrices(budget);
  const giftMissing = budget.giftPerGuest.amount === null;

  const now = new Date();
  const count = countdown(wedding, today);
  const stage = stageOf(today, wedding);

  return (
    <>
      <PageHeader
        title={`${t.greeting[dayPart(now.getHours())]}, ${t.header.couple(...settings.names)}`}
        subtitle={t.pages.home.subtitle}
      />
      <div className="space-y-6 md:space-y-8">
        <Card tone="hero" className="flex items-center justify-between gap-4 p-5 md:gap-8 md:p-8">
          <div className="min-w-0 flex-1">
            {(count.kind === 'future' || count.kind === 'tomorrow') && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                {t.home.countdownEyebrow}
              </p>
            )}
            <Heading as="h2" className="mt-1.5 text-balance !text-[1.625rem] md:!text-[2rem]">
              {t.home.countdownTitle(count)}
            </Heading>
            <p className="mt-1.5 text-sm text-muted">{withCity(capitalize(formatLongDate(wedding)), settings.city)}</p>
            <hr className="my-4 max-w-xl border-line" />
            <p className="max-w-md text-sm text-muted">
              {count.kind === 'past' ? t.home.countdownNotePast : t.home.countdownNote}
            </p>
          </div>
          {count.kind !== 'past' && (
            <div
              aria-hidden="true"
              className="flex size-24 shrink-0 flex-col items-center justify-center rounded-full bg-soft md:size-36"
            >
              {count.kind === 'today' ? (
                <Heart className="size-8 text-accent md:size-12" />
              ) : (
                <>
                  <span className="font-serif text-4xl leading-none tabular-nums md:text-5xl">{count.days}</span>
                  <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                    {t.home.countdownUnit(count.days)}
                  </span>
                </>
              )}
            </div>
          )}
        </Card>

        <section aria-labelledby="home-overview">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <Heading as="h2" id="home-overview">
              {t.home.overview}
            </Heading>
          </div>
          <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label={t.home.tasks}
              value={t.home.tasksDone(done, total)}
              helper={t.home.tasksDetail(recoverCount, currentCount)}
            >
              <ProgressBar className="mt-3" label={t.home.tasks} value={done} max={Math.max(total, 1)} />
            </StatCard>

            <StatCard
              label={giftMissing ? t.home.cost(guests) : t.home.balance(guests)}
              value={
                !pricesFilled ? (
                  <span className="text-faint">—</span>
                ) : giftMissing ? (
                  formatMoney(scenario.total, cur)
                ) : (
                  formatSignedMoney(scenario.balance, cur)
                )
              }
              valueClassName={cx(pricesFilled && !giftMissing && (scenario.balance >= 0 ? 'text-plus' : 'text-minus'))}
              helper={
                !pricesFilled ? (
                  <>
                    {t.home.needPrices}{' '}
                    <Link className={cx(LINK, 'text-accent')} to={routes.budget} params={{ weddingId }}>
                      {t.home.goCalculator}
                    </Link>
                  </>
                ) : giftMissing ? (
                  t.home.needGift
                ) : (
                  <>
                    {t.home.breakEven(formatMoney(scenario.breakEvenGift, cur))}
                    <br />
                    {t.home.paidLine(formatMoney(payments.paid, cur), formatMoney(payments.total, cur))}
                  </>
                )
              }
            />

            <StatCard
              className="sm:col-span-2 lg:col-span-1"
              label={t.home.payments}
              value={formatMoney(payments.paid, cur)}
              helper={t.home.remaining(formatMoney(payments.remaining, cur))}
            >
              <ProgressBar
                className="mt-3"
                label={t.home.paymentsProgress}
                value={paidPercent(payments.paid, payments.total)}
              />
            </StatCard>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
          <section aria-labelledby="home-next">
            <Heading as="h2" id="home-next">
              {t.home.next}
            </Heading>
            <p className="mb-3 mt-1 text-xs text-muted md:text-sm">{t.home.nextHint}</p>
            {next.length ? (
              <Card className="overflow-hidden">
                <ul aria-label={t.home.nextList}>
                  {next.map((task) => (
                    <NextTask
                      key={task.id}
                      task={task}
                      wedding={wedding}
                      today={today}
                      names={settings.names}
                      readOnly={!canEdit('tasks')}
                      actions={actions}
                    />
                  ))}
                </ul>
                <div className="border-t border-line px-4 py-1 md:py-3">
                  <Link className={cx(LINK, 'text-accent')} to={routes.tasks} params={{ weddingId }}>
                    {t.home.goStart}
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </Card>
            ) : (
              <EmptyState icon={PartyPopper} title={t.home.allDoneTitle}>
                {t.home.allDone}
              </EmptyState>
            )}
          </section>

          <Card tone="warm" className="p-5 md:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{t.home.stageEyebrow}</p>
            <Heading as="h2" className="mt-2 text-balance !text-2xl">
              {t.stages[stage]}
            </Heading>
            <p className="mt-2 text-sm text-muted">{t.home.stageDescriptions[stage]}</p>
            <hr className="my-4 border-line" />
            <p className="text-sm font-semibold">{t.home.stageTasks(currentCount)}</p>
            <Link className={cx(LINK, 'mt-1')} to={routes.tasks} params={{ weddingId }}>
              {t.home.goStage}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}

const STATUS_ICON = { todo: Circle, doing: CircleDot, done: CircleCheck } as const;

function NextTask({
  task,
  wedding,
  today,
  names,
  readOnly,
  actions,
}: {
  task: Task;
  wedding: Date;
  today: Date;
  names: readonly [string, string];
  readOnly: boolean;
  actions: TaskActions;
}) {
  const t = useT();
  const Icon = STATUS_ICON[task.status];
  const due = dueDate(task, wedding);
  const recover = isRecover(task, wedding, today);
  const overdue = !recover && isOverdue(task, wedding, today);

  let dueText: ReactNode = t.tasks.dueNone;
  if (recover) dueText = t.tasks.dueRecover;
  else if (due) {
    const short = formatShortDate(due);
    dueText = capitalize(t.tasks.until(due.getFullYear() === today.getFullYear() ? short.slice(0, -5) : short));
  }

  return (
    <li className="flex items-center gap-1 border-t border-line first:border-t-0 pr-4">
      <button
        type="button"
        disabled={readOnly}
        onClick={() => actions.cycleStatus(task.id)}
        aria-label={`${task.title || t.tasks.untitled}: ${t.status[task.status]}. ${t.statusHint}`}
        title={t.statusHint}
        className="inline-flex size-11 shrink-0 items-center justify-center text-accent"
      >
        <Icon size={20} aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1 py-3">
        <p className={cx('text-sm font-semibold leading-snug', !task.title && 'italic text-muted')}>
          {task.title || t.tasks.untitled}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {t.categories[task.category]} · {t.owner(task.owner, names)}
        </p>
      </div>
      <span className={cx('shrink-0 whitespace-nowrap text-xs font-medium', overdue ? 'text-minus' : 'text-muted')}>
        {dueText}
      </span>
    </li>
  );
}
