import { ChevronDown, ListChecks, Plus } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { TaskRow } from '../components/TaskRow';
import { Banner, Button, Card, cx, EmptyState, FilterChip, ProgressBar, Segmented } from '../components/ui';
import { useSettings, useTasks } from '../data/hooks';
import { useTaskActions } from '../data/taskActions';
import { parseISODate } from '../domain/dates';
import type { Task } from '../domain/schema';
import {
  filterByOwner,
  filterRecover,
  groupByCategory,
  groupByStage,
  nextDue,
  type OwnerFilter,
  progress,
  STAGE_IDS,
  type StageState,
  stageOf,
  stageProgress,
  stageState,
} from '../domain/tasks';
import { useT } from '../i18n';
import { formatDayMonth } from '../lib/format';
import { useToday } from '../lib/useToday';
import { useWedding } from '../lib/wedding';

type View = 'stages' | 'categories';

const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.08em] text-muted';

export function Start() {
  const t = useT();
  const { id: weddingId, canEdit } = useWedding();
  const settings = useSettings();
  const allTasks = useTasks(weddingId);
  const actions = useTaskActions(weddingId);
  const readOnly = !canEdit('tasks');
  const today = useToday();
  const [view, setView] = useState<View>('stages');
  const [owner, setOwner] = useState<OwnerFilter>('all');
  const [onlyRecover, setOnlyRecover] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({});

  const wedding = parseISODate(settings.weddingDate);
  const byOwner = filterByOwner(allTasks, owner);
  const recoverCount = filterRecover(byOwner, wedding, today).length;
  const tasks = onlyRecover ? filterRecover(byOwner, wedding, today) : byOwner;
  const filtering = owner !== 'all' || onlyRecover;
  const { done, total } = progress(allTasks);

  const row = (task: Task, recover = false, showYear = false) => (
    <TaskRow
      key={task.id}
      task={task}
      wedding={wedding}
      today={today}
      names={settings.names}
      recover={recover}
      showYear={showYear}
      expanded={openId === task.id}
      readOnly={readOnly}
      actions={actions}
      onToggle={() => setOpenId((id) => (id === task.id ? null : task.id))}
    />
  );

  const clearFilters = () => {
    setOwner('all');
    setOnlyRecover(false);
  };

  const onAdd = () => {
    const id = actions.add();
    setView('stages');
    clearFilters();
    setGroupOpen({});
    setOpenId(id);
    requestAnimationFrame(() =>
      document.getElementById(`task-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
    );
  };

  const toggleGroup = (id: string, current: boolean) => setGroupOpen((s) => ({ ...s, [id]: !current }));

  return (
    <>
      <PageHeader
        title={t.pages.tasks.title}
        subtitle={t.pages.tasks.subtitle}
        action={
          readOnly ? undefined : (
            <Button onClick={onAdd}>
              <Plus size={16} aria-hidden="true" />
              {t.tasks.add}
            </Button>
          )
        }
      />
      {readOnly && <Banner className="mb-6">{t.tasks.readOnly}</Banner>}
      <div className="space-y-6">
        <StageTimeline wedding={wedding} today={today} />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="min-w-0 space-y-4">
            <div className="max-md:sr-only">
              <h2 className="font-serif text-xl leading-snug">{t.tasks.sectionTitle}</h2>
              <p className="mt-0.5 text-xs text-muted">{t.tasks.remaining(total - done)}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                label={t.tasks.viewLabel}
                value={view}
                onChange={setView}
                className="max-md:w-full max-md:[&>button]:flex-1"
                options={[
                  { value: 'stages', label: t.tasks.byStage },
                  { value: 'categories', label: t.tasks.byCategory },
                ]}
              />
              <OwnerSelect value={owner} onChange={setOwner} names={settings.names} />
              {(recoverCount > 0 || onlyRecover) && (
                <FilterChip selected={onlyRecover} count={recoverCount} onClick={() => setOnlyRecover((v) => !v)}>
                  {t.tasks.recover}
                </FilterChip>
              )}
              <span className="ml-auto hidden text-xs font-semibold text-muted md:inline">
                {t.tasks.doneOf(done, total)}
              </span>
            </div>

            {tasks.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title={t.tasks.emptyTitle}
                action={
                  filtering ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      {t.tasks.clearFilters}
                    </Button>
                  ) : undefined
                }
              >
                {filtering ? t.tasks.emptyHint : undefined}
              </EmptyState>
            ) : view === 'stages' ? (
              <StageList
                tasks={tasks}
                wedding={wedding}
                today={today}
                openId={openId}
                filtering={filtering}
                groupOpen={groupOpen}
                onToggleGroup={toggleGroup}
                row={row}
              />
            ) : (
              groupByCategory(tasks, wedding).map((group) => (
                <Group
                  key={group.category}
                  id={`cat-${group.category}`}
                  title={t.categories[group.category]}
                  badge={t.tasks.count(group.tasks.length)}
                >
                  {group.tasks.map((task) => row(task, false, true))}
                </Group>
              ))
            )}

            <div className="space-y-2 pt-2 md:hidden">
              <ProgressBar value={done} max={total} label={t.tasks.doneOf(done, total)} />
              <p className="text-right text-xs font-semibold text-muted">{t.tasks.doneOf(done, total)}</p>
            </div>
          </section>

          <Rail tasks={allTasks} wedding={wedding} today={today} names={settings.names} />
        </div>
      </div>
    </>
  );
}

function OwnerSelect({
  value,
  onChange,
  names,
}: {
  value: OwnerFilter;
  onChange: (value: OwnerFilter) => void;
  names: readonly [string, string];
}) {
  const t = useT();
  const options: { value: OwnerFilter; label: string }[] = [
    { value: 'all', label: t.tasks.all },
    { value: 'p1', label: t.owner('p1', names) },
    { value: 'p2', label: t.owner('p2', names) },
    { value: 'both', label: t.owner('both', names) },
  ];
  return (
    <label className="relative inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface pl-3 pr-8 text-xs md:min-h-9">
      <span className="font-medium text-muted">{t.tasks.ownerFilter}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as OwnerFilter)}
        className="cursor-pointer appearance-none bg-transparent py-2 pr-1 text-xs font-semibold text-ink outline-offset-8"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-2.5 text-muted" />
    </label>
  );
}

const CHIP_STATES: Record<StageState, string> = {
  passed: 'bg-soft text-ink',
  current: 'bg-accent-solid text-on-accent',
  upcoming: 'border border-line bg-surface text-muted',
};

function StageTimeline({ wedding, today }: { wedding: Date; today: Date }) {
  const t = useT();
  const { current, total } = stageProgress(wedding, today);
  const stages = STAGE_IDS.map((stage) => ({ stage, state: stageState(stage, wedding, today) }));
  const srState = (state: StageState) => <span className="sr-only"> ({t.tasks.stageState[state]})</span>;

  return (
    <>
      <Card className="hidden px-6 py-5 md:block">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={EYEBROW}>{t.tasks.stageEyebrow}</p>
            <p className="mt-1.5 font-serif text-2xl leading-tight">{t.stages[stageOf(today, wedding)]}</p>
          </div>
          <p className="text-xs font-medium text-muted">{t.tasks.stageOf(current, total)}</p>
        </div>
        <ol aria-label={t.tasks.timelineLabel} className="mt-4 flex gap-1.5">
          {stages.map(({ stage, state }) => (
            <li key={stage} aria-current={state === 'current' ? 'step' : undefined} className="min-w-0 flex-1">
              <div className={cx('h-1.5 rounded-full', state === 'upcoming' ? 'bg-soft' : 'bg-accent-solid')} />
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={cx(
                    'size-2.5 shrink-0 rounded-full border-2',
                    state === 'upcoming' ? 'border-faint bg-surface' : 'border-accent-solid bg-accent-solid',
                    state === 'current' && 'ring-2 ring-accent/30 ring-offset-1 ring-offset-surface',
                  )}
                />
                <span
                  className={cx(
                    'truncate text-[11px]',
                    state === 'current' ? 'font-semibold text-ink' : 'font-medium text-muted',
                  )}
                >
                  {t.tasks.stageShort[stage]}
                  {srState(state)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="relative -mx-1 overflow-x-auto px-1 md:hidden">
        <ol aria-label={t.tasks.timelineLabel} className="flex w-max gap-2 pb-1">
          {stages.map(({ stage, state }) => (
            <li
              key={stage}
              aria-current={state === 'current' ? 'step' : undefined}
              className={cx(
                'whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-medium',
                CHIP_STATES[state],
                state === 'current' && 'font-semibold',
              )}
            >
              {t.tasks.stageShort[stage]}
              {srState(state)}
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}

function Rail({
  tasks,
  wedding,
  today,
  names,
}: {
  tasks: Task[];
  wedding: Date;
  today: Date;
  names: readonly [string, string];
}) {
  const t = useT();
  const { current, total, ratio } = stageProgress(wedding, today);
  const tone = t.tasks.rhythmTone[ratio < 0.34 ? 'start' : ratio < 0.67 ? 'middle' : 'end'];
  const next = nextDue(tasks, wedding, today);
  const recoverCount = filterRecover(tasks, wedding, today).length;

  return (
    <aside className="space-y-4">
      <Card tone="warm" className="p-5">
        <h2 className={EYEBROW}>{t.tasks.rhythm}</h2>
        <p className="mt-2 font-serif text-xl leading-snug">{tone.title}</p>
        <p className="mt-1 text-sm text-muted">{tone.text}</p>
        <ProgressBar value={current} max={total} label={t.tasks.rhythmStages(current, total)} className="mt-4" />
        <p className="mt-2 text-xs font-semibold">{t.tasks.rhythmStages(current, total)}</p>
      </Card>

      <Card className="p-5">
        <h2 className={EYEBROW}>{t.tasks.nextDue}</h2>
        {next ? (
          <>
            <p className="mt-2 font-serif text-xl leading-snug">{formatDayMonth(next.due)}</p>
            <p className="mt-1 text-sm font-semibold">{next.task.title || t.tasks.untitled}</p>
            <p className="mt-0.5 text-xs text-muted">
              {t.owner(next.task.owner, names)} · {t.categories[next.task.category]}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">{t.tasks.noNextDue}</p>
        )}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-4">
          <span className="text-sm font-semibold">{t.tasks.recover}</span>
          <span className="rounded-full bg-warm px-2.5 py-1 text-[11px] font-semibold">
            {t.tasks.count(recoverCount)}
          </span>
        </div>
        <p className="mt-4 text-xs text-muted">{t.tasks.privacy}</p>
      </Card>
    </aside>
  );
}

function StageList({
  tasks,
  wedding,
  today,
  openId,
  filtering,
  groupOpen,
  onToggleGroup,
  row,
}: {
  tasks: Task[];
  wedding: Date;
  today: Date;
  openId: string | null;
  filtering: boolean;
  groupOpen: Record<string, boolean>;
  onToggleGroup: (id: string, current: boolean) => void;
  row: (task: Task, recover?: boolean, showYear?: boolean) => ReactNode;
}) {
  const t = useT();
  const view = groupByStage(tasks, wedding, today);
  const contains = (list: Task[]) => list.some((task) => task.id === openId);
  const isOpen = (id: string, list: Task[]) => groupOpen[id] ?? contains(list);

  return (
    <>
      {view.recover.length > 0 && (
        <Group
          id="recover"
          title={t.tasks.recover}
          eyebrow={t.tasks.recoverHint}
          badge={t.tasks.count(view.recover.length)}
          tone="warm"
        >
          {view.recover.map((task) => row(task, true))}
        </Group>
      )}
      {view.stages.map((group, i) => {
        if (!group.isCurrent && group.tasks.length === 0) return null;
        if (group.isCurrent && group.tasks.length === 0 && filtering) return null;
        const id = `stage-${group.stage}`;
        const prevEnd = view.stages[i - 1]?.end;
        if (group.isCurrent) {
          return (
            <Group
              key={id}
              id={id}
              title={t.stages[group.stage]}
              eyebrow={group.end ? t.tasks.nowUntil(formatDayMonth(group.end)) : t.tasks.current}
              badge={t.tasks.count(group.tasks.length)}
              tone="hero"
            >
              {group.tasks.length ? group.tasks.map((task) => row(task)) : <Empty />}
            </Group>
          );
        }
        const open = isOpen(id, group.tasks);
        return (
          <Group
            key={id}
            id={id}
            title={t.stages[group.stage]}
            subtitle={
              prevEnd
                ? t.tasks.startsAfter(formatDayMonth(prevEnd), t.tasks.count(group.tasks.length))
                : t.tasks.count(group.tasks.length)
            }
            open={open}
            onToggle={() => onToggleGroup(id, open)}
          >
            {group.tasks.map((task) => row(task))}
          </Group>
        );
      })}
      {view.noDate.length > 0 && (
        <Group id="nodate" title={t.tasks.noDate} badge={t.tasks.count(view.noDate.length)}>
          {view.noDate.map((task) => row(task))}
        </Group>
      )}
      {view.finished.length > 0 && (
        <Group
          id="finished"
          title={t.tasks.finished}
          subtitle={t.tasks.count(view.finished.length)}
          open={isOpen('finished', view.finished)}
          onToggle={() => onToggleGroup('finished', isOpen('finished', view.finished))}
        >
          {view.finished.map((task) => row(task))}
        </Group>
      )}
    </>
  );
}

const GROUP_TONES = { hero: 'bg-hero', warm: 'bg-warm', plain: 'bg-sunken/60' };

/** Grup de taskuri. Cu `onToggle` devine pliabil (buton cu aria-expanded); altfel e mereu deschis. */
function Group({
  id,
  title,
  eyebrow,
  subtitle,
  badge,
  tone = 'plain',
  open = true,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  badge?: string;
  tone?: keyof typeof GROUP_TONES;
  open?: boolean;
  onToggle?: () => void;
  children: ReactNode;
}) {
  const headingId = `group-${id}`;
  const listId = `list-${id}`;
  return (
    <section aria-labelledby={headingId} className="overflow-hidden rounded-2xl border border-line bg-surface">
      {onToggle ? (
        <h3 id={headingId}>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={listId}
            className="flex min-h-14 w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-sunken/60"
          >
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold leading-snug">{title}</span>
              {subtitle && <span className="mt-0.5 block text-xs text-muted">{subtitle}</span>}
            </span>
            <ChevronDown
              size={18}
              aria-hidden="true"
              className={cx('shrink-0 text-muted transition-transform', open && 'rotate-180')}
            />
          </button>
        </h3>
      ) : (
        <div className={cx('flex items-center justify-between gap-3 px-5 py-4', GROUP_TONES[tone])}>
          <div className="min-w-0">
            {eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{eyebrow}</p>}
            <h3 id={headingId} className="text-[17px] font-semibold leading-snug">
              {title}
            </h3>
          </div>
          {badge && (
            <span className="shrink-0 rounded-full bg-surface/70 px-2.5 py-1 text-[11px] font-semibold">{badge}</span>
          )}
        </div>
      )}
      <ul id={listId} hidden={!open} className="border-t border-line">
        {children}
      </ul>
    </section>
  );
}

function Empty() {
  const t = useT();
  return <li className="px-5 py-3 text-sm text-muted">{t.tasks.empty}</li>;
}
