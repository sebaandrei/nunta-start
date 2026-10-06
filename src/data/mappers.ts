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
 * - `budget_lines` nu are coloana `paid` (încă): `paid` se citește mereu null. NS-043 are nevoie
 *   de o migrare nouă pentru plăți.
 */

import { DEFAULT_EUR_RATE, DEFAULT_GUESTS } from '../domain/initial';
import type { Budget, BudgetLine, Category, Currency, Money, Owner, Settings, Status, Task } from '../domain/schema';
import { CATEGORY_IDS, CURRENCIES, OWNERS, STATUSES } from '../domain/schema';
import type { Role } from '../lib/workspaces';
import type { Database, Json } from '../types/database';

type Tables = Database['public']['Tables'];
export type TaskRow = Tables['tasks']['Row'];
export type TaskInsert = Tables['tasks']['Insert'];
export type TaskUpdate = Tables['tasks']['Update'];
export type WeddingRow = Tables['weddings']['Row'];
export type BudgetSettingsRow = Tables['budget_settings']['Row'];
export type BudgetScenarioRow = Tables['budget_scenarios']['Row'];
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
    paid: null,
    note: row.note,
  };
}

export function lineToUpdate(patch: Partial<Omit<BudgetLine, 'id' | 'paid'>>): BudgetLineUpdate {
  const out: BudgetLineUpdate = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.unitPrice !== undefined) out.unit_price = moneyColumn(patch.unitPrice);
  if (patch.currency !== undefined) out.currency = patch.currency;
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
