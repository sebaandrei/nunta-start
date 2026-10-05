import { useState, type ReactNode } from 'react';
import { TaskRow } from '../components/TaskRow';
import { Button, cx, Segmented } from '../components/ui';
import { parseISODate } from '../domain/dates';
import type { Task } from '../domain/schema';
import { filterByOwner, groupByCategory, groupByStage, progress, type OwnerFilter } from '../domain/tasks';
import { formatDate } from '../lib/format';
import { useToday } from '../lib/useToday';
import { useAppData, useStore } from '../store';
import { t } from '../text';

type View = 'stages' | 'categories';

export function Start() {
  const data = useAppData();
  const addTask = useStore((s) => s.addTask);
  const today = useToday();
  const [view, setView] = useState<View>('stages');
  const [owner, setOwner] = useState<OwnerFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const { settings } = data;
  const wedding = parseISODate(settings.weddingDate);
  const tasks = filterByOwner(data.tasks, owner);
  const { done, total } = progress(data.tasks);

  const row = (task: Task, recover = false) => (
    <TaskRow
      key={task.id}
      task={task}
      wedding={wedding}
      today={today}
      names={settings.names}
      recover={recover}
      expanded={openId === task.id}
      onToggle={() => setOpenId((id) => (id === task.id ? null : task.id))}
    />
  );

  const onAdd = () => {
    const id = addTask();
    setView('stages');
    setOwner('all');
    setOpenId(id);
    requestAnimationFrame(() =>
      document.getElementById(`task-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label={t.tasks.viewLabel}
          value={view}
          onChange={setView}
          options={[
            { value: 'stages', label: t.tasks.byStage },
            { value: 'categories', label: t.tasks.byCategory },
          ]}
        />
        <Segmented
          label={t.tasks.ownerFilter}
          value={owner}
          onChange={setOwner}
          options={[
            { value: 'all', label: t.tasks.all },
            { value: 'p1', label: t.owner('p1', settings.names) },
            { value: 'p2', label: t.owner('p2', settings.names) },
            { value: 'both', label: t.owner('both', settings.names) },
          ]}
        />
        <span className="ml-auto text-xs text-muted">{t.tasks.doneCount(done, total)}</span>
        <Button onClick={onAdd}>{t.tasks.add}</Button>
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          {t.tasks.emptyFilter}
        </p>
      ) : view === 'stages' ? (
        <StageList tasks={tasks} wedding={wedding} today={today} openId={openId} row={row} />
      ) : (
        groupByCategory(tasks, wedding).map((group) => (
          <Group key={group.category} title={t.categories[group.category]} hint={t.tasks.count(group.tasks.length)} open>
            {group.tasks.map((task) => row(task))}
          </Group>
        ))
      )}
    </div>
  );
}

function StageList({
  tasks,
  wedding,
  today,
  openId,
  row,
}: {
  tasks: Task[];
  wedding: Date;
  today: Date;
  openId: string | null;
  row: (task: Task, recover?: boolean) => ReactNode;
}) {
  const view = groupByStage(tasks, wedding, today);
  const contains = (list: Task[]) => list.some((task) => task.id === openId);

  return (
    <>
      {view.recover.length > 0 && (
        <Group title={t.tasks.recover} hint={t.tasks.recoverHint} open tone="recover">
          {view.recover.map((task) => row(task, true))}
        </Group>
      )}
      {view.stages
        .filter((group) => group.isCurrent || group.tasks.length > 0)
        .map((group) => (
          <Group
            key={group.stage}
            title={t.stages[group.stage]}
            hint={[
              group.end && t.tasks.until(formatDate(group.end)),
              group.isCurrent && t.tasks.current,
              t.tasks.count(group.tasks.length),
            ]
              .filter(Boolean)
              .join(' · ')}
            open={group.isCurrent || contains(group.tasks)}
            highlight={group.isCurrent}
          >
            {group.tasks.length ? group.tasks.map((task) => row(task)) : <Empty />}
          </Group>
        ))}
      {view.noDate.length > 0 && (
        <Group title={t.tasks.noDate} hint={t.tasks.count(view.noDate.length)} open>
          {view.noDate.map((task) => row(task))}
        </Group>
      )}
      {view.finished.length > 0 && (
        <Group title={t.tasks.finished} hint={t.tasks.count(view.finished.length)} open={contains(view.finished)}>
          {view.finished.map((task) => row(task))}
        </Group>
      )}
    </>
  );
}

function Group({
  title,
  hint,
  open,
  highlight,
  tone,
  children,
}: {
  title: string;
  hint: string;
  open?: boolean;
  highlight?: boolean;
  tone?: 'recover';
  children: ReactNode;
}) {
  return (
    <details
      open={open}
      className={cx(
        'group overflow-hidden rounded-xl border bg-surface',
        highlight ? 'border-accent/50' : tone === 'recover' ? 'border-minus/30' : 'border-line',
      )}
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 bg-sunken/60 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="inline-block text-faint transition-transform group-open:rotate-90">›</span>
          {title}
        </span>
        <span className="text-xs text-muted">{hint}</span>
      </summary>
      <ul>{children}</ul>
    </details>
  );
}

function Empty() {
  return <li className="px-4 py-3 text-sm text-muted">{t.tasks.empty}</li>;
}
