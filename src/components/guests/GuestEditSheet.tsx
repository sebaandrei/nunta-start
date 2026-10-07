import { Trash2 } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import type { GuestActions } from '../../data/guestActions';
import type { ServerGuest } from '../../data/mappers';
import { AGE_GROUPS, ATTENDING, DIETS } from '../../domain/guests';
import { useT } from '../../i18n';
import { Button, CommitInput, Field, Select } from '../ui';

/**
 * Foaie de jos pentru editarea unui invitat pe telefon, pe <dialog> nativ (focus, Escape, click pe fundal).
 * `guest` null = închisă.
 */
export function GuestEditSheet({
  guest,
  readOnly,
  actions,
  onClose,
}: {
  guest: ServerGuest | null;
  readOnly: boolean;
  actions: GuestActions;
  onClose: () => void;
}) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const open = guest !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes the native dialog.
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-0 mt-auto w-full max-w-none rounded-t-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40"
    >
      {guest && (
        <div className="p-4 pb-6">
          <h2 id={titleId} className="font-serif text-xl leading-snug">
            {t.guests.editGuest}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label={t.guests.firstName}>
              <CommitInput
                value={guest.firstName}
                disabled={readOnly}
                onCommit={(firstName) => actions.updateGuest(guest.id, { firstName })}
              />
            </Field>
            <Field label={t.guests.lastName}>
              <CommitInput
                value={guest.lastName}
                disabled={readOnly}
                onCommit={(lastName) => actions.updateGuest(guest.id, { lastName })}
              />
            </Field>
            <Field label={t.guests.ageGroup}>
              <Select
                value={guest.ageGroup}
                disabled={readOnly}
                onChange={(e) =>
                  actions.updateGuest(guest.id, { ageGroup: AGE_GROUPS.find((v) => v === e.target.value) })
                }
              >
                {AGE_GROUPS.map((v) => (
                  <option key={v} value={v}>
                    {t.guests.ageGroups[v]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t.guests.diet}>
              <Select
                value={guest.diet}
                disabled={readOnly}
                onChange={(e) => actions.updateGuest(guest.id, { diet: DIETS.find((v) => v === e.target.value) })}
              >
                {DIETS.map((v) => (
                  <option key={v} value={v}>
                    {t.guests.diets[v]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t.guests.attending} className="col-span-2">
              <Select
                value={guest.attending}
                disabled={readOnly}
                onChange={(e) =>
                  actions.updateGuest(guest.id, { attending: ATTENDING.find((v) => v === e.target.value) })
                }
              >
                {ATTENDING.map((v) => (
                  <option key={v} value={v}>
                    {t.guests.statuses[v]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {!readOnly && (
              <Button
                variant="danger"
                onClick={() => {
                  actions.removeGuest(guest.id);
                  ref.current?.close();
                }}
              >
                <Trash2 size={16} aria-hidden="true" />
                {t.guests.removeGuest}
              </Button>
            )}
            <Button onClick={() => ref.current?.close()}>{t.guests.done}</Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
