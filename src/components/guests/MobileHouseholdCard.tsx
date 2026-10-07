import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import { memo } from 'react';
import type { GuestActions } from '../../data/guestActions';
import type { ServerGuest, ServerHousehold } from '../../data/mappers';
import { OWNERS } from '../../domain/schema';
import { useT } from '../../i18n';
import { Button, Card, CommitInput, IconButton, Select, Tag } from '../ui';
import { RsvpLinkButtons } from './RsvpLinkButtons';

const ATTENDING_TONES = { unknown: 'neutral', yes: 'soft', no: 'minus' } as const;

const sameItems = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/** Familia pe telefon: antet editabil și câte un rând atingibil pe invitat, care deschide foaia de editare. */
export const MobileHouseholdCard = memo(
  function MobileHouseholdCard({
    household,
    guests,
    size,
    names,
    readOnly,
    actions,
    onEditGuest,
  }: {
    household: ServerHousehold;
    guests: ServerGuest[];
    /** Toți invitații familiei, fără filtre. */
    size: number;
    names: readonly [string, string];
    readOnly: boolean;
    actions: GuestActions;
    onEditGuest: (guestId: string) => void;
  }) {
    const t = useT();
    return (
      <Card className="p-4">
        <CommitInput
          aria-label={t.guests.householdName}
          placeholder={t.guests.householdName}
          value={household.name}
          disabled={readOnly}
          onCommit={(name) => actions.updateHousehold(household.id, { name })}
          className="font-serif text-lg"
        />
        <div className="mt-2 flex items-center gap-2">
          <Select
            aria-label={t.guests.side}
            value={household.side}
            disabled={readOnly}
            onChange={(e) => actions.updateHousehold(household.id, { side: OWNERS.find((o) => o === e.target.value) })}
            className="min-w-0 flex-1"
          >
            {OWNERS.map((owner) => (
              <option key={owner} value={owner}>
                {t.owner(owner, names)}
              </option>
            ))}
          </Select>
          <span className="shrink-0 text-xs text-muted">{t.guests.guestCount(guests.length)}</span>
          {!readOnly && (
            <IconButton
              label={t.guests.removeHousehold}
              onClick={() => {
                if (window.confirm(t.guests.confirmRemoveHousehold(household.name, size)))
                  actions.removeHousehold(household.id);
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
            </IconButton>
          )}
        </div>

        {guests.length > 0 && (
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {guests.map((guest) => {
              const name = `${guest.firstName} ${guest.lastName}`.trim();
              return (
                <li key={guest.id}>
                  <button
                    type="button"
                    onClick={() => onEditGuest(guest.id)}
                    aria-label={`${t.guests.editGuest}: ${name || t.guests.newGuest}`}
                    className="flex min-h-11 w-full items-center gap-2 py-2 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className={name ? 'block truncate text-sm' : 'block truncate text-sm text-muted'}>
                        {name || t.guests.newGuest}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {t.guests.ageGroups[guest.ageGroup]} · {t.guests.diets[guest.diet]}
                      </span>
                    </span>
                    <Tag tone={ATTENDING_TONES[guest.attending]}>{t.guests.statuses[guest.attending]}</Tag>
                    <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {guests.length === 0 && <p className="mt-3 text-sm text-muted">{t.guests.emptyHousehold}</p>}

        {!readOnly && (
          <div className="mt-3">
            <RsvpLinkButtons householdId={household.id} householdName={household.name} />
          </div>
        )}

        {!readOnly && (
          <Button variant="link" className="mt-3 min-h-11 text-sm" onClick={() => actions.addGuest(household.id)}>
            <Plus size={14} aria-hidden="true" />
            {t.guests.addGuest}
          </Button>
        )}
      </Card>
    );
  },
  (a, b) =>
    a.household === b.household &&
    a.size === b.size &&
    a.names === b.names &&
    a.readOnly === b.readOnly &&
    a.actions === b.actions &&
    a.onEditGuest === b.onEditGuest &&
    sameItems(a.guests, b.guests),
);
