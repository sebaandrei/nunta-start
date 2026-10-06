import { addDays, toISODate } from '../domain/dates';
import { CATEGORY_IDS, OWNERS, STATUSES, type Task } from '../domain/schema';
import { dueDate, isOverdue } from '../domain/tasks';
import { useT } from '../i18n';
import { formatShortDate } from '../lib/format';
import { useStore } from '../store';
import { Button, cx, Field, Select, StatusPill, Tag, TextArea, TextInput } from './ui';

export function TaskRow({
  task,
  wedding,
  today,
  names,
  recover,
  expanded,
  onToggle,
}: {
  task: Task;
  wedding: Date;
  today: Date;
  names: readonly [string, string];
  recover: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  const cycleStatus = useStore((s) => s.cycleTaskStatus);
  const due = dueDate(task, wedding);
  const overdue = !recover && isOverdue(task, wedding, today);
  const dueText = recover ? t.tasks.dueRecover : due ? formatShortDate(due) : t.tasks.dueNone;
  const done = task.status === 'done';

  return (
    <li id={`task-${task.id}`} className="border-t border-line first:border-t-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 transition-colors hover:bg-sunken/40 md:flex-nowrap">
        <StatusPill status={task.status} onClick={() => cycleStatus(task.id)} />
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className={cx(
            'min-h-6 min-w-0 flex-1 text-left text-sm font-medium leading-snug hover:text-accent',
            done && 'text-faint line-through',
            !task.title && 'italic text-muted',
          )}
        >
          {task.title || t.tasks.untitled}
        </button>
        <div className="flex basis-full flex-wrap items-center gap-x-3 gap-y-1 pl-[6rem] md:basis-auto md:flex-nowrap md:pl-0">
          <Tag tone="soft">{t.categories[task.category]}</Tag>
          <span className="truncate text-xs text-muted md:w-16">{t.owner(task.owner, names)}</span>
          <span
            className={cx('whitespace-nowrap text-xs md:w-24 md:text-right', overdue ? 'text-minus' : 'text-muted')}
          >
            {dueText}
          </span>
        </div>
      </div>
      {expanded && <TaskEditor task={task} wedding={wedding} names={names} onClose={onToggle} />}
    </li>
  );
}

function TaskEditor({
  task,
  wedding,
  names,
  onClose,
}: {
  task: Task;
  wedding: Date;
  names: readonly [string, string];
  onClose: () => void;
}) {
  const t = useT();
  const updateTask = useStore((s) => s.updateTask);
  const removeTask = useStore((s) => s.removeTask);
  const update = (patch: Partial<Task>) => updateTask(task.id, patch);
  const due = dueDate(task, wedding);
  const auto = task.daysBefore === null ? null : addDays(wedding, -task.daysBefore);

  return (
    <div className="grid gap-3 border-t border-line bg-sunken/60 px-4 py-4 md:grid-cols-4">
      <Field label={t.tasks.edit.title} className="md:col-span-4">
        <TextInput
          autoFocus={!task.title}
          value={task.title}
          placeholder={t.tasks.edit.titlePlaceholder}
          onChange={(e) => update({ title: e.target.value })}
        />
      </Field>
      <Field label={t.tasks.edit.category}>
        <Select value={task.category} onChange={(e) => update({ category: e.target.value as Task['category'] })}>
          {CATEGORY_IDS.map((id) => (
            <option key={id} value={id}>
              {t.categories[id]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t.tasks.edit.owner}>
        <Select value={task.owner} onChange={(e) => update({ owner: e.target.value as Task['owner'] })}>
          {OWNERS.map((owner) => (
            <option key={owner} value={owner}>
              {t.owner(owner, names)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t.tasks.edit.status}>
        <Select value={task.status} onChange={(e) => update({ status: e.target.value as Task['status'] })}>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {t.status[status]}
            </option>
          ))}
        </Select>
      </Field>
      <div>
        <Field
          label={t.tasks.edit.due}
          hint={auto && !task.manualDate ? t.tasks.edit.dueAuto(formatShortDate(auto)) : undefined}
        >
          <TextInput
            type="date"
            value={due ? toISODate(due) : ''}
            onChange={(e) => update({ manualDate: e.target.value || null })}
          />
        </Field>
        {auto && task.manualDate && (
          <Button variant="link" className="mt-1 text-xs" onClick={() => update({ manualDate: null })}>
            {t.tasks.edit.resetDue} ({formatShortDate(auto)})
          </Button>
        )}
      </div>
      <Field label={t.tasks.edit.details} className="md:col-span-2">
        <TextArea rows={3} value={task.details} onChange={(e) => update({ details: e.target.value })} />
      </Field>
      <Field label={t.tasks.edit.note} className="md:col-span-2">
        <TextArea rows={3} value={task.note} onChange={(e) => update({ note: e.target.value })} />
      </Field>
      <div className="flex items-center justify-between gap-2 md:col-span-4">
        <Button
          variant="danger"
          onClick={() => {
            if (window.confirm(t.tasks.edit.confirmRemove)) removeTask(task.id);
          }}
        >
          {t.tasks.edit.remove}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          {t.tasks.edit.close}
        </Button>
      </div>
    </div>
  );
}
