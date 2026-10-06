import { describe, expect, it } from 'vitest';
import { budgetDefaults, taskTemplate } from '../content';
import { createInitialData } from '../domain/initial';
import {
  type BudgetLineRow,
  type BudgetScenarioRow,
  type BudgetSettingsRow,
  budgetFromRows,
  changedPatch,
  coupleLabel,
  createWeddingArgs,
  godparentsFromJson,
  guestScenarios,
  lineFromRow,
  lineToInsert,
  lineToUpdate,
  moneyColumn,
  nextPosition,
  num,
  positionBetween,
  type ServerTask,
  scenarioIds,
  settingsFromWedding,
  type TaskRow,
  taskFromRow,
  taskPatchToUpdate,
  taskToInsert,
  type WeddingRow,
  weddingFromRow,
} from './mappers';

const taskRow = (over: Partial<TaskRow> = {}): TaskRow => ({
  id: 't1',
  wedding_id: 'w1',
  template_key: 'k',
  title: 'Locația',
  category: 'locatie',
  assignee: 'p2',
  status: 'doing',
  days_before: 300,
  manual_date: null,
  details: 'd',
  note: 'n',
  position: 20,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  updated_by: null,
  ...over,
});

describe('taskFromRow', () => {
  it('maps every column', () => {
    expect(taskFromRow(taskRow())).toEqual({
      id: 't1',
      title: 'Locația',
      category: 'locatie',
      owner: 'p2',
      status: 'doing',
      daysBefore: 300,
      manualDate: null,
      details: 'd',
      note: 'n',
      position: 20,
    });
  });

  it('keeps null days_before and a manual date', () => {
    const t = taskFromRow(taskRow({ days_before: null, manual_date: '2027-02-03' }));
    expect(t.daysBefore).toBeNull();
    expect(t.manualDate).toBe('2027-02-03');
  });

  it('keeps negative days_before (after the wedding)', () => {
    expect(taskFromRow(taskRow({ days_before: -7 })).daysBefore).toBe(-7);
  });

  it('falls back on unknown enum values instead of crashing', () => {
    const t = taskFromRow(taskRow({ category: 'x', assignee: 'y', status: 'z' }));
    expect([t.category, t.owner, t.status]).toEqual(['altele', 'both', 'todo']);
  });

  it('reads a numeric position sent as a string', () => {
    expect(taskFromRow(taskRow({ position: '12.5' as unknown as number })).position).toBe(12.5);
  });
});

describe('task writes', () => {
  const task: ServerTask = taskFromRow(taskRow());

  it('round-trips through insert', () => {
    const insert = taskToInsert('w1', task);
    expect(insert).toMatchObject({ id: 't1', wedding_id: 'w1', assignee: 'p2', days_before: 300, position: 20 });
    expect(taskFromRow({ ...taskRow(), ...insert } as TaskRow)).toEqual(task);
  });

  it('sends only the changed columns, with DB names', () => {
    expect(taskPatchToUpdate({ owner: 'both' })).toEqual({ assignee: 'both' });
    expect(taskPatchToUpdate({ manualDate: null, daysBefore: null })).toEqual({ manual_date: null, days_before: null });
    expect(taskPatchToUpdate({})).toEqual({});
  });

  it('never sends the id', () => {
    expect(taskPatchToUpdate({ id: 'other', note: 'x' } as never)).toEqual({ note: 'x' });
  });

  it('changedPatch drops unchanged and undefined fields', () => {
    expect(changedPatch(task, { title: 'Locația', note: 'nou', details: undefined })).toEqual({ note: 'nou' });
    expect(changedPatch(task, { title: 'Locația' })).toEqual({});
  });
});

describe('positions', () => {
  it('puts a new task after the last one, step 10', () => {
    expect(nextPosition([])).toBe(0);
    expect(nextPosition([{ position: 0 }, { position: 40 }, { position: 10 }])).toBe(50);
  });

  it('computes a position between neighbours', () => {
    expect(positionBetween(null, null)).toBe(0);
    expect(positionBetween(null, 10)).toBe(0);
    expect(positionBetween(30, null)).toBe(40);
    expect(positionBetween(10, 20)).toBe(15);
  });
});

const weddingRow = (over: Partial<WeddingRow> = {}): WeddingRow => ({
  id: 'w1',
  name: 'Ana & Mihai',
  wedding_date: '2027-01-23',
  partner1_name: 'Ana',
  partner2_name: 'Mihai',
  eur_rate: 4.97,
  display_currency: 'EUR',
  city: 'Brașov',
  godparents: [{ godmother: 'M', godfather: 'F' }],
  deleted_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  updated_by: null,
  ...over,
});

describe('wedding mappers', () => {
  it('maps the row and the role', () => {
    const w = weddingFromRow(weddingRow(), 'planner');
    expect(w).toMatchObject({ id: 'w1', partner1: 'Ana', partner2: 'Mihai', date: '2027-01-23', role: 'planner' });
    expect(settingsFromWedding(w, '2030-01-01')).toEqual({
      weddingDate: '2027-01-23',
      names: ['Ana', 'Mihai'],
      eurRate: 4.97,
      displayCurrency: 'EUR',
      city: 'Brașov',
      godparents: [{ godmother: 'M', godfather: 'F' }],
    });
  });

  it('handles a null date and city', () => {
    const w = weddingFromRow(weddingRow({ wedding_date: null, city: null }), 'viewer');
    const s = settingsFromWedding(w, '2030-01-01');
    expect(s.weddingDate).toBe('2030-01-01');
    expect(s.city).toBe('');
  });

  it('tolerates malformed godparents json', () => {
    expect(godparentsFromJson(null as never)).toEqual([]);
    expect(godparentsFromJson({} as never)).toEqual([]);
    expect(godparentsFromJson([{ godmother: 'a' }, 3, { godmother: 'a', godfather: 'b' }])).toEqual([
      { godmother: 'a', godfather: 'b' },
    ]);
  });
});

describe('money', () => {
  it('rounds to two decimals for numeric(12,2)', () => {
    expect(moneyColumn(10.005)).toBe(10.01);
    expect(moneyColumn(0.1 + 0.2)).toBe(0.3);
    expect(moneyColumn(null)).toBeNull();
    expect(moneyColumn(0)).toBe(0);
  });

  it('reads numbers and numeric strings, null otherwise', () => {
    expect(num(12.5)).toBe(12.5);
    expect(num('12.50')).toBe(12.5);
    expect(num(null)).toBeNull();
    expect(num('abc')).toBeNull();
  });
});

const lineRow = (over: Partial<BudgetLineRow> = {}): BudgetLineRow => ({
  id: 'l1',
  wedding_id: 'w1',
  name: 'Locația',
  unit_price: 120.5,
  currency: 'EUR',
  qty_kind: 'per_guest',
  qty_count: null,
  note: 'x',
  vendor_id: null,
  position: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  updated_by: null,
  ...over,
});

describe('budget lines', () => {
  it('maps per_guest and fixed quantities', () => {
    expect(lineFromRow(lineRow()).quantity).toEqual({ kind: 'perGuest' });
    expect(lineFromRow(lineRow({ qty_kind: 'fixed', qty_count: 3 })).quantity).toEqual({ kind: 'fixed', count: 3 });
    expect(lineFromRow(lineRow({ qty_kind: 'fixed', qty_count: null })).quantity).toEqual({ kind: 'fixed', count: 0 });
  });

  it('reads paid as null (no column yet) and a null price', () => {
    const l = lineFromRow(lineRow({ unit_price: null }));
    expect(l.paid).toBeNull();
    expect(l.unitPrice).toBeNull();
  });

  it('round-trips through insert', () => {
    for (const row of [lineRow(), lineRow({ qty_kind: 'fixed', qty_count: 2, unit_price: null, currency: 'RON' })]) {
      const line = lineFromRow(row);
      expect(lineFromRow({ ...row, ...lineToInsert('w1', line, 0) } as BudgetLineRow)).toEqual(line);
    }
  });

  it('clears qty_count when switching to per guest', () => {
    expect(lineToUpdate({ quantity: { kind: 'perGuest' } })).toEqual({ qty_kind: 'per_guest', qty_count: null });
    expect(lineToUpdate({ quantity: { kind: 'fixed', count: 4 } })).toEqual({ qty_kind: 'fixed', qty_count: 4 });
    expect(lineToUpdate({ unitPrice: 1.239 })).toEqual({ unit_price: 1.24 });
    expect(lineToUpdate({})).toEqual({});
  });
});

const scenario = (id: string, guests: number, position: number): BudgetScenarioRow => ({
  id,
  wedding_id: 'w1',
  guests,
  position,
  created_at: `2026-01-0${position / 10 + 1}T00:00:00Z`,
  updated_at: '2026-01-01T00:00:00Z',
  updated_by: null,
});

const settingsRow = (over: Partial<BudgetSettingsRow> = {}): BudgetSettingsRow => ({
  wedding_id: 'w1',
  gift_per_guest: 100,
  gift_per_guest_currency: 'RON',
  family_gift: null,
  family_gift_currency: 'EUR',
  selected_scenario_id: 's2',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  updated_by: null,
  ...over,
});

describe('budgetFromRows', () => {
  const scenarios = [scenario('s2', 250, 10), scenario('s1', 200, 0)];

  it('orders scenarios by position and resolves the selected index', () => {
    const b = budgetFromRows({
      settings: settingsRow(),
      scenarios,
      lines: [lineRow({ id: 'b', position: 10 }), lineRow({ id: 'a', position: 0 })],
    });
    expect(b.scenarios).toEqual([200, 250]);
    expect(b.selected).toBe(1);
    expect(b.giftPerGuest).toEqual({ amount: 100, currency: 'RON' });
    expect(b.familyGift).toEqual({ amount: null, currency: 'EUR' });
    expect(b.lines.map((l) => l.id)).toEqual(['a', 'b']);
    expect(scenarioIds(scenarios)).toEqual(['s1', 's2']);
  });

  it('selects the first scenario when the selection is missing', () => {
    expect(
      budgetFromRows({ settings: settingsRow({ selected_scenario_id: null }), scenarios, lines: [] }).selected,
    ).toBe(0);
    expect(budgetFromRows({ settings: null, scenarios, lines: [] }).selected).toBe(0);
  });

  it('survives missing settings', () => {
    const b = budgetFromRows({ settings: null, scenarios: [], lines: [] });
    expect(b.giftPerGuest.amount).toBeNull();
    expect(b.scenarios).toEqual([]);
  });
});

describe('createWeddingArgs', () => {
  const input = { name1: ' Ana ', name2: 'Mihai', date: '2027-01-23', city: ' Brașov ', guests: 120 };

  it('builds the RPC input with the active templates', () => {
    for (const locale of ['ro', 'en'] as const) {
      const args = createWeddingArgs(input, taskTemplate(locale), budgetDefaults(locale));
      expect(args.input).toMatchObject({
        name: 'Ana & Mihai',
        partner1_name: 'Ana',
        partner2_name: 'Mihai',
        wedding_date: '2027-01-23',
        city: 'Brașov',
        guest_scenarios: [120],
        eur_rate: 5,
        display_currency: 'EUR',
      });
      expect(args.tasks_template).toHaveLength(taskTemplate(locale).length);
      expect(args.budget_template).toHaveLength(budgetDefaults(locale).length);
    }
  });

  it('uses the same guest default as the local initial data', () => {
    const local = createInitialData({ weddingDate: '2027-01-23', names: ['A', 'B'], guests: null }, new Date());
    expect(guestScenarios(null)).toEqual(local.budget.scenarios);
    expect(guestScenarios(80)).toEqual([80]);
  });

  it('sends a null city when empty and carries template fields', () => {
    const args = createWeddingArgs({ ...input, city: '  ' }, taskTemplate('ro'), budgetDefaults('ro'));
    expect((args.input as { city: unknown }).city).toBeNull();
    const first = taskTemplate('ro')[0];
    expect((args.tasks_template as unknown[])[0]).toEqual({
      template_key: first.id,
      title: first.title,
      category: first.category,
      days_before: first.daysBefore,
      details: first.details,
    });
  });

  it('labels a couple, dropping empty names', () => {
    expect(coupleLabel(' A ', ' B ')).toBe('A & B');
    expect(coupleLabel('A', ' ')).toBe('A');
  });
});
