import { Plus, Trash2, Users } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { GuestEditSheet } from '../components/guests/GuestEditSheet';
import { MobileHouseholdCard } from '../components/guests/MobileHouseholdCard';
import { RsvpLinkButtons } from '../components/guests/RsvpLinkButtons';
import { PageHeader } from '../components/PageHeader';
import { Banner, Button, Card, CommitInput, cx, EmptyState, IconButton, Segmented, Select } from '../components/ui';
import { type GuestActions, useGuestActions } from '../data/guestActions';
import { useGuests, useHouseholds, useSettings } from '../data/hooks';
import type { ServerGuest, ServerHousehold } from '../data/mappers';
import {
  AGE_GROUPS,
  ATTENDING,
  type AttendingFilter,
  DIETS,
  groupGuests,
  guestStats,
  type SideFilter,
} from '../domain/guests';
import { OWNERS } from '../domain/schema';
import { useT } from '../i18n';
import { formatNumber } from '../lib/format';
import { useMediaQuery } from '../lib/useMediaQuery';
import { useWedding } from '../lib/wedding';

export function Guests() {
  const t = useT();
  const { id: weddingId, canEdit } = useWedding();
  const { names } = useSettings();
  const households = useHouseholds(weddingId);
  const guests = useGuests(weddingId);
  const actions = useGuestActions(weddingId);
  const readOnly = !canEdit('guests');
  const [side, setSide] = useState<SideFilter>('all');
  const [attending, setAttending] = useState<AttendingFilter>('all');
  const mobile = !useMediaQuery('(min-width: 768px)');
  const [editingId, setEditingId] = useState<string | null>(null);

  const stats = useMemo(() => guestStats(households, guests), [households, guests]);
  const groups = useMemo(() => groupGuests(households, guests, side, attending), [households, guests, side, attending]);
  // Ștergerea unei familii șterge toți invitații ei, nu doar cei rămași după filtru.
  const sizes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const guest of guests) counts.set(guest.householdId, (counts.get(guest.householdId) ?? 0) + 1);
    return counts;
  }, [guests]);
  const filtering = side !== 'all' || attending !== 'all';
  const clearFilters = () => {
    setSide('all');
    setAttending('all');
  };

  const items: [string, number, string?][] = [
    [t.guests.statHouseholds, stats.households],
    [t.guests.statGuests, stats.total, t.guests.statGuestsHelper(stats.adults, stats.children)],
    [t.guests.statuses.yes, stats.byAttending.yes],
    [t.guests.statuses.no, stats.byAttending.no],
    [t.guests.statuses.unknown, stats.byAttending.unknown],
    [t.guests.statVegetarian, stats.byDiet.vegetarian],
    [t.guests.statVegan, stats.byDiet.vegan],
  ];

  return (
    <>
      <PageHeader
        title={t.pages.guests.title}
        subtitle={t.pages.guests.subtitle}
        action={
          readOnly ? undefined : (
            <Button
              onClick={() => {
                // Familia nouă n-are invitați: cu un filtru de răspuns activ ar dispărea imediat.
                setAttending('all');
                actions.addHousehold(side === 'all' ? 'both' : side);
              }}
            >
              <Plus size={16} aria-hidden="true" />
              {t.guests.addHousehold}
            </Button>
          )
        }
      />
      {readOnly && <Banner className="mb-6">{t.guests.readOnly}</Banner>}

      <Card className="mb-6 p-4 md:p-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4 lg:grid-cols-7">
          {items.map(([label, value, helper]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</dt>
              <dd className="mt-1 font-serif text-2xl leading-tight tabular-nums">{formatNumber(value)}</dd>
              {helper && <dd className="mt-0.5 text-xs text-muted">{helper}</dd>}
            </div>
          ))}
        </dl>
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          label={t.guests.sideFilter}
          value={side}
          onChange={setSide}
          options={[
            { value: 'all', label: t.guests.all },
            ...OWNERS.map((owner) => ({ value: owner, label: t.owner(owner, names) })),
          ]}
        />
        <Segmented
          label={t.guests.statusFilter}
          value={attending}
          onChange={setAttending}
          options={[
            { value: 'all', label: t.guests.all },
            ...ATTENDING.map((status) => ({ value: status, label: t.guests.statuses[status] })),
          ]}
        />
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title={filtering ? t.guests.noMatchTitle : t.guests.emptyTitle}
          action={
            filtering ? (
              <Button variant="secondary" onClick={clearFilters}>
                {t.guests.clearFilters}
              </Button>
            ) : undefined
          }
        >
          {filtering ? t.guests.noMatchHint : t.guests.emptyHint}
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {groups.map(({ household, guests: members }) =>
            mobile ? (
              <MobileHouseholdCard
                key={household.id}
                household={household}
                guests={members}
                size={sizes.get(household.id) ?? 0}
                names={names}
                readOnly={readOnly}
                actions={actions}
                onEditGuest={setEditingId}
              />
            ) : (
              <HouseholdCard
                key={household.id}
                household={household}
                guests={members}
                size={sizes.get(household.id) ?? 0}
                names={names}
                readOnly={readOnly}
                actions={actions}
              />
            ),
          )}
        </div>
      )}
      {/* Rămâne montată și la trecerea pe desktop: dialogul se închide (blur → câmpul își trimite valoarea) și resetează editingId. */}
      <GuestEditSheet
        guest={mobile ? (guests.find((g) => g.id === editingId) ?? null) : null}
        readOnly={readOnly}
        actions={actions}
        onClose={() => setEditingId(null)}
      />
    </>
  );
}

const sameItems = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/** Se redesenează doar când familia, invitații ei sau drepturile se schimbă (nu la fiecare editare din altă familie). */
const HouseholdCard = memo(
  function HouseholdCard({
    household,
    guests,
    size,
    names,
    readOnly,
    actions,
  }: {
    household: ServerHousehold;
    guests: ServerGuest[];
    /** Toți invitații familiei, fără filtre. */
    size: number;
    names: readonly [string, string];
    readOnly: boolean;
    actions: GuestActions;
  }) {
    const t = useT();
    return (
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <CommitInput
            aria-label={t.guests.householdName}
            placeholder={t.guests.householdName}
            value={household.name}
            disabled={readOnly}
            onCommit={(name) => actions.updateHousehold(household.id, { name })}
            className="min-w-0 flex-1 basis-48 font-serif text-lg"
          />
          <Select
            aria-label={t.guests.side}
            value={household.side}
            disabled={readOnly}
            onChange={(e) => actions.updateHousehold(household.id, { side: OWNERS.find((o) => o === e.target.value) })}
            className="w-40"
          >
            {OWNERS.map((owner) => (
              <option key={owner} value={owner}>
                {t.owner(owner, names)}
              </option>
            ))}
          </Select>
          <span className="text-xs text-muted">{t.guests.guestCount(guests.length)}</span>
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

        <ul className="mt-3 space-y-2">
          {guests.map((guest) => (
            <GuestRow key={guest.id} guest={guest} readOnly={readOnly} actions={actions} />
          ))}
        </ul>
        {guests.length === 0 && <p className="mt-3 text-sm text-muted">{t.guests.emptyHousehold}</p>}

        {!readOnly && (
          <div className="mt-3">
            <RsvpLinkButtons householdId={household.id} householdName={household.name} />
          </div>
        )}

        {!readOnly && (
          <Button variant="link" className={cx('mt-3 text-sm')} onClick={() => actions.addGuest(household.id)}>
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
    sameItems(a.guests, b.guests),
);

const GuestRow = memo(function GuestRow({
  guest,
  readOnly,
  actions,
}: {
  guest: ServerGuest;
  readOnly: boolean;
  actions: GuestActions;
}) {
  const t = useT();
  const text = (field: 'firstName' | 'lastName', label: string) => (
    <CommitInput
      aria-label={label}
      placeholder={label}
      value={guest[field]}
      disabled={readOnly}
      onCommit={(value) => actions.updateGuest(guest.id, { [field]: value })}
      className="min-w-0 flex-1 basis-32"
    />
  );
  return (
    <li className="flex flex-wrap items-center gap-2">
      {text('firstName', t.guests.firstName)}
      {text('lastName', t.guests.lastName)}
      <Select
        aria-label={t.guests.ageGroup}
        value={guest.ageGroup}
        disabled={readOnly}
        onChange={(e) => actions.updateGuest(guest.id, { ageGroup: AGE_GROUPS.find((v) => v === e.target.value) })}
        className="w-28"
      >
        {AGE_GROUPS.map((v) => (
          <option key={v} value={v}>
            {t.guests.ageGroups[v]}
          </option>
        ))}
      </Select>
      <Select
        aria-label={t.guests.diet}
        value={guest.diet}
        disabled={readOnly}
        onChange={(e) => actions.updateGuest(guest.id, { diet: DIETS.find((v) => v === e.target.value) })}
        className="w-36"
      >
        {DIETS.map((v) => (
          <option key={v} value={v}>
            {t.guests.diets[v]}
          </option>
        ))}
      </Select>
      <Select
        aria-label={t.guests.attending}
        value={guest.attending}
        disabled={readOnly}
        onChange={(e) => actions.updateGuest(guest.id, { attending: ATTENDING.find((v) => v === e.target.value) })}
        className="w-36"
      >
        {ATTENDING.map((v) => (
          <option key={v} value={v}>
            {t.guests.statuses[v]}
          </option>
        ))}
      </Select>
      {!readOnly && (
        <IconButton label={t.guests.removeGuest} onClick={() => actions.removeGuest(guest.id)}>
          <Trash2 size={16} aria-hidden="true" />
        </IconButton>
      )}
    </li>
  );
});
