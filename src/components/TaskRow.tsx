import { Check } from 'lucide-react';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import type { TaskActions } from '../data/taskActions';
import { addDays, toISODate } from '../domain/dates';
import { CATEGORY_IDS, OWNERS, STATUSES, type Status, type Task } from '../domain/schema';
import { dueDate, showsOverdue } from '../domain/tasks';
import { useT } from '../i18n';
import { formatDeadline, formatShortDate } from '../lib/format';
import { Button, cx, Field, Select, TextArea, TextInput } from './ui';

export function TaskRow({
  task,
  wedding,
  today,
  names,
  recover,
  showYear,
  expanded,
  readOnly,
  actions,
  onToggle,
}: {
  task: Task;
  wedding: Date;
  today: Date;
  names: readonly [string, string];
  recover: boolean;
  /** Vederea nu dă context de etapă (pe categorii): arată anul. */
  showYear: boolean;
  expanded: boolean;
  /** Rolul nu poate modifica taskurile (viewer): fără comenzi de editare. */
  readOnly: boolean;
  actions: TaskActions;
  onToggle: () => void;
}) {
  const t = useT();
  const due = dueDate(task, wedding);
  const overdue = showsOverdue(task, wedding, today, recover);
  const dueText = recover ? t.tasks.dueRecover : due ? formatDeadline(due, { today, showYear }) : t.tasks.dueNone;
  const done = task.status === 'done';

  return (
    <li id={`task-${task.id}`} className="border-t border-line-subtle first:border-t-0">
      <div className="flex items-start gap-1 px-2 py-1 transition-colors hover:bg-sunken/40 md:gap-2 md:px-5 md:py-3.5">
        <StatusCheck
          status={task.status}
          label={t.tasks.checkLabel(t.status[task.status], task.title || t.tasks.untitled)}
          hint={t.statusHint}
          disabled={readOnly}
          onClick={() => actions.cycleStatus(task.id)}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center gap-0.5 rounded-lg py-1 text-left md:min-h-0"
        >
          <span
            className={cx(
              'text-sm font-semibold leading-snug',
              done && 'text-faint line-through',
              !task.title && 'italic text-muted',
            )}
          >
            {task.title || t.tasks.untitled}
          </span>
          <span className="text-xs text-muted">
            {t.categories[task.category]} · {t.owner(task.owner, names)}
          </span>
          {task.status === 'doing' && (
            <span className="mt-1 rounded-full bg-warm-pill px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warm-text">
              {t.status.doing}
            </span>
          )}
        </button>
        <span
          className={cx(
            'shrink-0 whitespace-nowrap py-3.5 pr-2 text-xs font-medium md:py-1 md:pr-0',
            overdue && !done ? 'text-minus' : 'text-muted',
          )}
        >
          {recover || !due ? dueText : <span className="max-md:hidden">{t.tasks.dueBy(dueText)}</span>}
          {!recover && due && <span className="md:hidden">{dueText}</span>}
        </span>
      </div>
      {expanded && (
        <TaskEditor
          task={task}
          wedding={wedding}
          names={names}
          readOnly={readOnly}
          actions={actions}
          onClose={onToggle}
        />
      )}
    </li>
  );
}

/** Cercul care schimbă statusul (de făcut, în lucru, gata). Zonă de apăsare de 44px pe telefon. */
function StatusCheck({
  status,
  label,
  hint,
  disabled,
  onClick,
}: {
  status: Status;
  label: string;
  hint: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={status === 'done' ? true : status === 'doing' ? 'mixed' : false}
      title={hint}
      className="group inline-flex size-11 shrink-0 items-center justify-center rounded-full md:size-8"
    >
      <span
        className={cx(
          'inline-flex size-6 items-center justify-center rounded-full border-2 transition-colors',
          status === 'todo' && 'border-line bg-surface group-hover:border-accent',
          status === 'doing' && 'border-warm-line bg-warm-pill',
          status === 'done' && 'border-accent-solid bg-accent-solid text-on-accent',
        )}
      >
        {status === 'done' && <Check size={14} strokeWidth={3} aria-hidden="true" />}
        {status === 'doing' && <span className="size-2 rounded-full bg-warm-solid" aria-hidden="true" />}
      </span>
    </button>
  );
}

function TaskEditor({
  task,
  wedding,
  names,
  readOnly,
  actions,
  onClose,
}: {
  task: Task;
  wedding: Date;
  names: readonly [string, string];
  readOnly: boolean;
  actions: TaskActions;
  onClose: () => void;
}) {
  const t = useT();
  const update = (patch: Partial<Task>) => actions.update(task.id, patch);
  const title = useDraft(task.title, (title) => update({ title }));
  const details = useDraft(task.details, (details) => update({ details }));
  const note = useDraft(task.note, (note) => update({ note }));
  const due = dueDate(task, wedding);
  const auto = task.daysBefore === null ? null : addDays(wedding, -task.daysBefore);

  return (
    <div className="grid gap-3 border-t border-line bg-sunken/60 px-4 py-4 md:grid-cols-4">
      <fieldset disabled={readOnly} className="contents">
        <Field label={t.tasks.edit.title} className="md:col-span-4">
          <TextInput autoFocus={!task.title && !readOnly} placeholder={t.tasks.edit.titlePlaceholder} {...title} />
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
          {auto && task.manualDate && !readOnly && (
            <Button variant="link" className="mt-1 text-xs" onClick={() => update({ manualDate: null })}>
              {t.tasks.edit.resetDue} ({formatShortDate(auto)})
            </Button>
          )}
        </div>
        <Field label={t.tasks.edit.details} className="md:col-span-2">
          <TextArea rows={3} {...details} />
        </Field>
        <Field label={t.tasks.edit.note} className="md:col-span-2">
          <TextArea rows={3} {...note} />
        </Field>
      </fieldset>
      <div className="flex items-center justify-between gap-2 md:col-span-4">
        {readOnly ? (
          <span />
        ) : (
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm(t.tasks.edit.confirmRemove)) actions.remove(task.id);
            }}
          >
            {t.tasks.edit.remove}
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          {t.tasks.edit.close}
        </Button>
      </div>
    </div>
  );
}

/**
 * Câmp de text cu ciorna lui: se scrie local și abia la părăsirea câmpului pleacă o singură scriere
 * spre server (nu una la fiecare literă). Dacă valoarea din cache se schimbă între timp (revenire după
 * eroare, un alt membru), ciorna o urmează cât timp omul nu scrie.
 */
function useDraft(value: string, commit: (value: string) => void) {
  const [draft, setDraft] = useState(value);
  const editing = useRef(false);
  useEffect(() => {
    if (!editing.current) setDraft(value);
  }, [value]);
  return {
    value: draft,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      editing.current = true;
      setDraft(e.target.value);
    },
    onBlur: () => {
      editing.current = false;
      if (draft !== value) commit(draft);
    },
  };
}
