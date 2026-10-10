/**
 * Mapări pure între rândurile din baza de date și tipurile de domeniu din src/domain/schema.ts.
 *
 * Decizii:
 * - Banii (numeric(12,2)) sunt `number` în domeniu (ca în tot codul existent); PostgREST îi
 *   trimite ca numere JSON. La scriere se rotunjesc la 2 zecimale (`moneyColumn`). Citirea
 *   tolerează și șiruri numerice.
 * - Asignarea: coloana `assignee` are exact valorile `p1 | p2 | both`, ca `Task.owner`.
 * - `days_before`/`manual_date` -> `daysBefore`/`manualDate` (null rămâne null).
 * - `position` e numeric în DB (pas de 10 la creare); rămâne în `ServerTask` ca reordonarea
 *   și realtime să poată lucra cu ea, iar UI-ul îl ignoră.
 * - `budget_lines.paid` e suma plătită, în moneda liniei; null = nimic înregistrat. Plățile pe
 *   tranșe (NS-090) vor înlocui coloana.
 */

import type { Collection, CollectionField, CollectionRecord, FieldType } from '../domain/collections';
import { FIELD_TYPES } from '../domain/collections';
import type { AgeGroup, Attending, Diet, Guest, Household } from '../domain/guests';
import { AGE_GROUPS, ATTENDING, DIETS } from '../domain/guests';
import { DEFAULT_EUR_RATE, DEFAULT_GUESTS } from '../domain/initial';
import type { Budget, BudgetLine, Category, Currency, Money, Owner, Settings, Status, Task } from '../domain/schema';
import { CATEGORY_IDS, CURRENCIES, MAX_GODPARENT_PAIRS, OWNERS, STATUSES } from '../domain/schema';
import type { Role } from '../lib/workspaces';
import type { Database, Json } from '../types/database';

type Tables = Database['public']['Tables'];
export type TaskRow = Tables['tasks']['Row'];
export type TaskInsert = Tables['tasks']['Insert'];
export type TaskUpdate = Tables['tasks']['Update'];
export type HouseholdRow = Tables['households']['Row'];
export type HouseholdInsert = Tables['households']['Insert'];
export type HouseholdUpdate = Tables['households']['Update'];
export type GuestRow = Tables['guests']['Row'];
export type GuestInsert = Tables['guests']['Insert'];
export type GuestUpdate = Tables['guests']['Update'];
export type WeddingRow = Tables['weddings']['Row'];
export type WeddingUpdate = Tables['weddings']['Update'];
export type BudgetSettingsRow = Tables['budget_settings']['Row'];
export type BudgetSettingsUpdate = Tables['budget_settings']['Update'];
export type BudgetScenarioRow = Tables['budget_scenarios']['Row'];
export type BudgetScenarioInsert = Tables['budget_scenarios']['Insert'];
export type BudgetLineRow = Tables['budget_lines']['Row'];
export type BudgetLineInsert = Tables['budget_lines']['Insert'];
export type BudgetLineUpdate = Tables['budget_lines']['Update'];

/** Taskul din domeniu, cu poziția din server. */
export type ServerTask = Task & { position: number };

/** Nunta și rolul meu în ea. */
export interface Wedding {
  id: string;
  name: string;
  date: string | null;
  city: string | null;
  partner1: string;
  partner2: string;
  eurRate: number;
  displayCurrency: Currency;
  godparents: Settings['godparents'];
  role: Role;
}

const oneOf = <T extends string>(list: readonly T[], value: unknown, fallback: T): T =>
  list.find((v) => v === value) ?? fallback;

/** numeric din PostgREST: număr, dar tolerăm și șirul. */
export function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Valoare pentru o coloană numeric(12,2): rotunjită la 2 zecimale. */
export function moneyColumn(value: number | null): number | null {
  return value === null ? null : Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------- tasks

export function taskFromRow(row: TaskRow): ServerTask {
  return {
    id: row.id,
    title: row.title,
    category: oneOf<Category>(CATEGORY_IDS, row.category, 'altele'),
    owner: oneOf<Owner>(OWNERS, row.assignee, 'both'),
    status: oneOf<Status>(STATUSES, row.status, 'todo'),
    daysBefore: row.days_before,
    manualDate: row.manual_date,
    details: row.details,
    note: row.note,
    position: num(row.position) ?? 0,
  };
}

/** Doar coloanele din `patch`; `id` nu se trimite niciodată. */
export function taskPatchToUpdate(patch: Partial<Omit<ServerTask, 'id'>>): TaskUpdate {
  const out: TaskUpdate = {};
  if (patch.title !== undefined) out.title = patch.title;
  if (patch.category !== undefined) out.category = patch.category;
  if (patch.owner !== undefined) out.assignee = patch.owner;
  if (patch.status !== undefined) out.status = patch.status;
  if (patch.daysBefore !== undefined) out.days_before = patch.daysBefore;
  if (patch.manualDate !== undefined) out.manual_date = patch.manualDate;
  if (patch.details !== undefined) out.details = patch.details;
  if (patch.note !== undefined) out.note = patch.note;
  if (patch.position !== undefined) out.position = patch.position;
  return out;
}

/** Doar câmpurile din `patch` care diferă de valorile curente; gol = nimic de trimis. */
export function changedPatch(
  task: ServerTask,
  patch: Partial<Omit<ServerTask, 'id'>>,
): Partial<Omit<ServerTask, 'id'>> {
  const out: Partial<Omit<ServerTask, 'id'>> = {};
  for (const key of Object.keys(patch) as (keyof typeof patch)[]) {
    if (patch[key] !== undefined && patch[key] !== task[key]) Object.assign(out, { [key]: patch[key] });
  }
  return out;
}

/** Task nou pentru insert; `id` vine de la client (UUID) ca update-ul optimist să aibă același id. */
export function taskToInsert(weddingId: string, task: ServerTask): TaskInsert {
  return {
    id: task.id,
    wedding_id: weddingId,
    title: task.title,
    category: task.category,
    assignee: task.owner,
    status: task.status,
    days_before: task.daysBefore,
    manual_date: task.manualDate,
    details: task.details,
    note: task.note,
    position: task.position,
  };
}

export const POSITION_STEP = 10;

/** Poziția unui task nou: după ultimul. */
export function nextPosition(tasks: readonly { position: number }[]): number {
  return tasks.reduce((max, t) => Math.max(max, t.position), -POSITION_STEP) + POSITION_STEP;
}

/** Poziția între doi vecini (null = capătul listei), pentru reordonare cu o singură scriere. */
export function positionBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return 0;
  if (before === null) return (after as number) - POSITION_STEP;
  if (after === null) return before + POSITION_STEP;
  return (before + after) / 2;
}

// -------------------------------------------------------------- weddings

export function godparentsFromJson(value: Json): Settings['godparents'] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((e) => {
    if (typeof e !== 'object' || e === null || Array.isArray(e)) return [];
    const { godmother, godfather } = e;
    return typeof godmother === 'string' && typeof godfather === 'string' ? [{ godmother, godfather }] : [];
  });
}

export function weddingFromRow(row: WeddingRow, role: Role): Wedding {
  return {
    id: row.id,
    name: row.name,
    date: row.wedding_date,
    city: row.city,
    partner1: row.partner1_name,
    partner2: row.partner2_name,
    eurRate: num(row.eur_rate) ?? DEFAULT_EUR_RATE,
    displayCurrency: oneOf<Currency>(CURRENCIES, row.display_currency, 'RON'),
    godparents: godparentsFromJson(row.godparents),
    role,
  };
}

/** Setările din forma locală; o dată lipsă (coloana e nullable) cade pe `fallbackDate`. */
export function settingsFromWedding(w: Wedding, fallbackDate: string): Settings {
  return {
    weddingDate: w.date ?? fallbackDate,
    names: [w.partner1, w.partner2],
    eurRate: w.eurRate,
    displayCurrency: w.displayCurrency,
    city: w.city ?? '',
    godparents: w.godparents,
  };
}

/** Câmpurile unei nunți pe care Setările și Calculatorul le pot schimba. */
export type WeddingPatch = Partial<
  Pick<Wedding, 'name' | 'date' | 'city' | 'partner1' | 'partner2' | 'eurRate' | 'displayCurrency' | 'godparents'>
>;

const MAX_TEXT = 120;
const MAX_NAME = 200;
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Coloanele care chiar se schimbă, gata de trimis; gol = nimic de scris. Valorile se aduc la forma din DB
 * (curs cu 4 zecimale și > 0, oraș gol = null, cel mult 5 perechi de nași, texte tăiate la limită).
 * Numele nunții („Ana & Mihai") urmează numele partenerilor doar cât timp era cel generat din ele.
 */
export function weddingPatchToUpdate(current: Wedding, patch: WeddingPatch): WeddingUpdate {
  const out: WeddingUpdate = {};
  const set = <K extends keyof WeddingUpdate>(column: K, value: WeddingUpdate[K], before: unknown) => {
    if (!sameJson(value, before)) out[column] = value;
  };
  if (patch.name !== undefined) set('name', patch.name.trim().slice(0, MAX_NAME), current.name);
  if (patch.date !== undefined) set('wedding_date', patch.date, current.date);
  if (patch.city !== undefined) set('city', patch.city?.trim().slice(0, MAX_TEXT) || null, current.city);
  if (patch.partner1 !== undefined) set('partner1_name', patch.partner1.trim().slice(0, MAX_TEXT), current.partner1);
  if (patch.partner2 !== undefined) set('partner2_name', patch.partner2.trim().slice(0, MAX_TEXT), current.partner2);
  if (patch.eurRate !== undefined && patch.eurRate > 0) {
    set('eur_rate', Math.round(patch.eurRate * 10000) / 10000, current.eurRate);
  }
  if (patch.displayCurrency !== undefined) set('display_currency', patch.displayCurrency, current.displayCurrency);
  if (patch.godparents !== undefined) {
    const pairs = patch.godparents.slice(0, MAX_GODPARENT_PAIRS).map(({ godmother, godfather }) => ({
      godmother: godmother.slice(0, MAX_TEXT),
      godfather: godfather.slice(0, MAX_TEXT),
    }));
    set('godparents', pairs, current.godparents);
  }
  const renamed = out.partner1_name !== undefined || out.partner2_name !== undefined;
  if (renamed && patch.name === undefined && current.name === coupleLabel(current.partner1, current.partner2)) {
    const label = coupleLabel(out.partner1_name ?? current.partner1, out.partner2_name ?? current.partner2);
    if (label) out.name = label;
  }
  return out;
}

/** Aplică un `WeddingUpdate` pe nunta din cache (update optimist), cu aceleași valori pe care le primește serverul. */
export function applyWeddingUpdate(w: Wedding, u: WeddingUpdate): Wedding {
  return {
    ...w,
    name: u.name ?? w.name,
    date: u.wedding_date === undefined ? w.date : u.wedding_date,
    city: u.city === undefined ? w.city : u.city,
    partner1: u.partner1_name ?? w.partner1,
    partner2: u.partner2_name ?? w.partner2,
    eurRate: typeof u.eur_rate === 'number' ? u.eur_rate : w.eurRate,
    displayCurrency: u.display_currency ?? w.displayCurrency,
    godparents: u.godparents === undefined ? w.godparents : godparentsFromJson(u.godparents),
  };
}

// ---------------------------------------------------------------- budget

const money = (amount: number | string | null | undefined, currency: Currency): Money => ({
  amount: num(amount),
  currency,
});

export function lineFromRow(row: BudgetLineRow): BudgetLine {
  return {
    id: row.id,
    name: row.name,
    unitPrice: num(row.unit_price),
    currency: oneOf<Currency>(CURRENCIES, row.currency, 'RON'),
    quantity: row.qty_kind === 'fixed' ? { kind: 'fixed', count: num(row.qty_count) ?? 0 } : { kind: 'perGuest' },
    paid: num(row.paid),
    note: row.note,
  };
}

export function lineToUpdate(patch: Partial<Omit<BudgetLine, 'id'>>): BudgetLineUpdate {
  const out: BudgetLineUpdate = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.unitPrice !== undefined) out.unit_price = moneyColumn(patch.unitPrice);
  if (patch.currency !== undefined) out.currency = patch.currency;
  if (patch.paid !== undefined) out.paid = moneyColumn(patch.paid);
  if (patch.note !== undefined) out.note = patch.note;
  if (patch.quantity !== undefined) {
    out.qty_kind = patch.quantity.kind === 'fixed' ? 'fixed' : 'per_guest';
    out.qty_count = patch.quantity.kind === 'fixed' ? patch.quantity.count : null;
  }
  return out;
}

export function lineToInsert(weddingId: string, line: BudgetLine, position: number): BudgetLineInsert {
  return { ...lineToUpdate(line), id: line.id, wedding_id: weddingId, position, name: line.name };
}

export interface BudgetRows {
  settings: BudgetSettingsRow | null;
  scenarios: readonly BudgetScenarioRow[];
  lines: readonly BudgetLineRow[];
}

const byPosition = <T extends { position: number | string; created_at: string }>(a: T, b: T) =>
  (num(a.position) ?? 0) - (num(b.position) ?? 0) || a.created_at.localeCompare(b.created_at);

/** O linie nouă așa cum o va întoarce serverul, pentru update-ul optimist al cache-ului. */
export function lineRowFromLine(weddingId: string, line: BudgetLine, position: number, now: string): BudgetLineRow {
  return {
    id: line.id,
    wedding_id: weddingId,
    name: line.name,
    unit_price: moneyColumn(line.unitPrice),
    currency: line.currency,
    qty_kind: line.quantity.kind === 'fixed' ? 'fixed' : 'per_guest',
    qty_count: line.quantity.kind === 'fixed' ? line.quantity.count : null,
    note: line.note,
    paid: moneyColumn(line.paid),
    vendor_id: null,
    position,
    created_at: now,
    updated_at: now,
    updated_by: null,
  };
}

/** Doar coloanele din `update` care diferă de rândul curent; gol = nimic de trimis. */
export function changedColumns<T extends object>(row: T, update: Partial<T>): Partial<T> {
  const out: Partial<T> = {};
  for (const column of Object.keys(update) as (keyof T)[]) {
    if (update[column] !== undefined && !sameJson(update[column], row[column])) out[column] = update[column];
  }
  return out;
}

/** Ce se schimbă la setările bugetului: darurile (sumă + monedă) și scenariul ales. */
export interface BudgetSettingsPatch {
  giftPerGuest?: Money;
  familyGift?: Money;
  selectedScenarioId?: string | null;
}

export function budgetSettingsPatchToUpdate(patch: BudgetSettingsPatch): BudgetSettingsUpdate {
  const out: BudgetSettingsUpdate = {};
  if (patch.giftPerGuest) {
    out.gift_per_guest = moneyColumn(patch.giftPerGuest.amount);
    out.gift_per_guest_currency = patch.giftPerGuest.currency;
  }
  if (patch.familyGift) {
    out.family_gift = moneyColumn(patch.familyGift.amount);
    out.family_gift_currency = patch.familyGift.currency;
  }
  if (patch.selectedScenarioId !== undefined) out.selected_scenario_id = patch.selectedScenarioId;
  return out;
}

/** Numărul de invitați al unui scenariu nou: cu 20% peste ultimul, rotunjit la zeci (ca în planul local). */
export function nextScenarioGuests(scenarios: readonly BudgetScenarioRow[]): number {
  const last = [...scenarios].sort(byPosition).at(-1)?.guests ?? DEFAULT_GUESTS;
  return Math.max(1, Math.round((last * 1.2) / 10) * 10);
}

/**
 * Scenariul care rămâne ales după ștergerea lui `removedId`: dacă ștergi scenariul ales explicit, alegerea
 * trece pe primul rămas (în ordinea din listă); altfel nu se schimbă nimic (`undefined`). Fără alegere
 * explicită, primul din listă e deja cel afișat.
 */
export function selectionAfterRemoval(
  settings: BudgetSettingsRow | null,
  scenarios: readonly BudgetScenarioRow[],
  removedId: string,
): string | undefined {
  if (settings?.selected_scenario_id !== removedId) return undefined;
  return [...scenarios].sort(byPosition).find((s) => s.id !== removedId)?.id;
}

/** Bugetul din forma locală. `selected` e indexul scenariului ales (0 dacă lipsește sau a dispărut). */
export function budgetFromRows({ settings, scenarios, lines }: BudgetRows): Budget {
  const sorted = [...scenarios].sort(byPosition);
  const selected = Math.max(
    0,
    sorted.findIndex((s) => s.id === settings?.selected_scenario_id),
  );
  return {
    scenarios: sorted.map((s) => s.guests),
    selected,
    giftPerGuest: money(settings?.gift_per_guest, oneOf(CURRENCIES, settings?.gift_per_guest_currency, 'RON')),
    familyGift: money(settings?.family_gift, oneOf(CURRENCIES, settings?.family_gift_currency, 'RON')),
    lines: [...lines].sort(byPosition).map(lineFromRow),
  };
}

/** Id-urile scenariilor în ordinea din `budgetFromRows`, ca indexul `selected` să se poată traduce înapoi. */
export function scenarioIds(scenarios: readonly BudgetScenarioRow[]): string[] {
  return [...scenarios].sort(byPosition).map((s) => s.id);
}

// ------------------------------------------------------- create_wedding

export interface CreateWeddingInput {
  name1: string;
  name2: string;
  /** ISO. */
  date: string;
  city: string;
  guests: number | null;
}

export interface TemplateTaskLike {
  id: string;
  title: string;
  category: string;
  daysBefore: number;
  details: string;
}

export interface BudgetDefaultLike {
  name: string;
  currency: Currency;
  perGuest: boolean;
}

/** Aceleași scenarii ca `createInitialData`: un singur scenariu, numărul de invitați sau 200. */
export function guestScenarios(guests: number | null): number[] {
  return [guests ?? DEFAULT_GUESTS];
}

/** „Ana & Mihai": numele nunții, ca în spațiile locale. */
export function coupleLabel(name1: string, name2: string): string {
  return [name1, name2]
    .map((n) => n.trim())
    .filter(Boolean)
    .join(' & ');
}

/**
 * Argumentele RPC-ului `create_wedding`, cu șabloanele limbii active.
 * Valorile implicite sunt cele din `createInitialData`: curs 5, afișare în EUR, un scenariu.
 */
export function createWeddingArgs(
  input: CreateWeddingInput,
  tasks: readonly TemplateTaskLike[],
  budget: readonly BudgetDefaultLike[],
): Database['public']['Functions']['create_wedding']['Args'] {
  const name1 = input.name1.trim();
  const name2 = input.name2.trim();
  return {
    input: {
      name: coupleLabel(name1, name2),
      partner1_name: name1,
      partner2_name: name2,
      wedding_date: input.date,
      city: input.city.trim() || null,
      eur_rate: DEFAULT_EUR_RATE,
      display_currency: 'EUR',
      guest_scenarios: guestScenarios(input.guests),
    },
    tasks_template: tasks.map((t) => ({
      template_key: t.id,
      title: t.title,
      category: t.category,
      days_before: t.daysBefore,
      details: t.details,
    })),
    budget_template: budget.map((b) => ({ name: b.name, currency: b.currency, per_guest: b.perGuest })),
  };
}

// ---------------------------------------------------------------- guests

/** Familia/invitatul din domeniu, cu poziția din server (ca `ServerTask`). */
export type ServerHousehold = Household & { position: number };
export type ServerGuest = Guest & { position: number };
export type HouseholdPatch = Partial<Pick<Household, 'name' | 'side'>>;
export type GuestPatch = Partial<Pick<Guest, 'firstName' | 'lastName' | 'ageGroup' | 'diet' | 'attending'>>;

export function householdFromRow(row: HouseholdRow): ServerHousehold {
  return {
    id: row.id,
    name: row.name,
    side: oneOf<Owner>(OWNERS, row.side, 'both'),
    notes: row.notes,
    position: row.position,
  };
}

export function guestFromRow(row: GuestRow): ServerGuest {
  return {
    id: row.id,
    householdId: row.household_id,
    firstName: row.first_name,
    lastName: row.last_name,
    ageGroup: oneOf<AgeGroup>(AGE_GROUPS, row.age_group, 'adult'),
    diet: oneOf<Diet>(DIETS, row.diet, 'classic'),
    attending: oneOf<Attending>(ATTENDING, row.attending, 'unknown'),
    position: row.position,
  };
}

/** `id` vine de la client (UUID), ca update-ul optimist să aibă același id. */
export function householdToInsert(weddingId: string, h: ServerHousehold): HouseholdInsert {
  return { id: h.id, wedding_id: weddingId, name: h.name, side: h.side, notes: h.notes, position: h.position };
}

export function guestToInsert(weddingId: string, g: ServerGuest): GuestInsert {
  return {
    id: g.id,
    wedding_id: weddingId,
    household_id: g.householdId,
    first_name: g.firstName,
    last_name: g.lastName,
    age_group: g.ageGroup,
    diet: g.diet,
    attending: g.attending,
    position: g.position,
  };
}

/** Doar coloanele din `patch` pleacă spre server. */
export function householdPatchToUpdate(patch: HouseholdPatch): HouseholdUpdate {
  return {
    ...(patch.name !== undefined && { name: patch.name }),
    ...(patch.side !== undefined && { side: patch.side }),
  };
}

export function guestPatchToUpdate(patch: GuestPatch): GuestUpdate {
  return {
    ...(patch.firstName !== undefined && { first_name: patch.firstName }),
    ...(patch.lastName !== undefined && { last_name: patch.lastName }),
    ...(patch.ageGroup !== undefined && { age_group: patch.ageGroup }),
    ...(patch.diet !== undefined && { diet: patch.diet }),
    ...(patch.attending !== undefined && { attending: patch.attending }),
  };
}

// ----------------------------------------------------------- collections

export type CollectionRow = Tables['collections']['Row'];
export type CollectionUpdate = Tables['collections']['Update'];
export type CollectionFieldRow = Tables['collection_fields']['Row'];
export type CollectionFieldInsert = Tables['collection_fields']['Insert'];
export type CollectionFieldUpdate = Tables['collection_fields']['Update'];
export type CollectionRecordRow = Tables['collection_records']['Row'];
export type CollectionRecordInsert = Tables['collection_records']['Insert'];

/** Paginile proprii, câmpurile și înregistrările lor, cu poziția din server (ca `ServerGuest`). */
export type ServerCollection = Collection & { position: number };
export type ServerCollectionField = CollectionField & { position: number };
export type ServerCollectionRecord = CollectionRecord & { position: number };
export type CollectionFieldPatch = Partial<Pick<CollectionField, 'label' | 'required' | 'options'>> & {
  position?: number;
};

export function collectionFromRow(row: CollectionRow): ServerCollection {
  return { id: row.id, name: row.name, slug: row.slug, position: row.position };
}

export function collectionFieldFromRow(row: CollectionFieldRow): ServerCollectionField {
  return {
    id: row.id,
    collectionId: row.collection_id,
    key: row.key,
    label: row.label,
    type: oneOf<FieldType>(FIELD_TYPES, row.type, 'text'),
    required: row.required,
    options: Array.isArray(row.options) ? row.options.filter((o): o is string => typeof o === 'string') : [],
    position: row.position,
  };
}

export function collectionRecordFromRow(row: CollectionRecordRow): ServerCollectionRecord {
  const { data } = row;
  return {
    id: row.id,
    collectionId: row.collection_id,
    data: typeof data === 'object' && data !== null && !Array.isArray(data) ? data : {},
    position: row.position,
  };
}

/** `id` vine de la client (UUID), ca update-ul optimist să aibă același id. */
export function collectionFieldToInsert(weddingId: string, f: ServerCollectionField): CollectionFieldInsert {
  return {
    id: f.id,
    wedding_id: weddingId,
    collection_id: f.collectionId,
    key: f.key,
    label: f.label,
    type: f.type,
    required: f.required,
    options: f.options,
    position: f.position,
  };
}

export function collectionRecordToInsert(weddingId: string, r: ServerCollectionRecord): CollectionRecordInsert {
  return {
    id: r.id,
    wedding_id: weddingId,
    collection_id: r.collectionId,
    data: r.data as NonNullable<Json>,
    position: r.position,
  };
}

export function collectionFieldPatchToUpdate(patch: CollectionFieldPatch): CollectionFieldUpdate {
  return {
    ...(patch.label !== undefined && { label: patch.label }),
    ...(patch.required !== undefined && { required: patch.required }),
    ...(patch.options !== undefined && { options: patch.options }),
    ...(patch.position !== undefined && { position: patch.position }),
  };
}
