import { describe, expect, it } from 'vitest';
import type { BudgetLine } from '../domain/schema';
import { lineView } from './budgetView';

const base: BudgetLine = {
  id: 'l1',
  name: 'Meniu',
  unitPrice: 320,
  currency: 'RON',
  quantity: { kind: 'perGuest' },
  paid: 12000,
  note: '',
};
const ron = { eurRate: 5, currency: 'RON' } as const;

describe('lineView', () => {
  it('multiplies per-guest lines by the guests', () => {
    const v = lineView(base, 180, ron);
    expect(v.total).toBe(57600);
    expect(v.paid).toBe(12000);
    expect(v.remaining).toBe(45600);
    expect(v.paidRatio).toBeCloseTo(12000 / 57600);
  });

  it('converts to the display currency', () => {
    const eur: BudgetLine = {
      ...base,
      unitPrice: 3100,
      currency: 'EUR',
      quantity: { kind: 'fixed', count: 1 },
      paid: 700,
    };
    const v = lineView(eur, 180, ron);
    expect(v.total).toBe(15500);
    expect(v.paid).toBe(3500);
    expect(v.remaining).toBe(12000);
    expect(lineView(eur, 180, { eurRate: 5, currency: 'EUR' }).total).toBe(3100);
  });

  it('treats empty amounts as 0 and never divides by zero', () => {
    const v = lineView({ ...base, unitPrice: null, paid: null }, 180, ron);
    expect(v).toEqual({ total: 0, paid: 0, remaining: 0, paidRatio: 0 });
  });

  it('caps the ratio at 1 when overpaid', () => {
    const v = lineView({ ...base, paid: 99999 }, 180, ron);
    expect(v.paidRatio).toBe(1);
    expect(v.remaining).toBe(0);
  });
});
