import { describe, expect, it } from 'vitest';
import { clearAmounts, convert, hasAmounts, lineRemaining, summarizePayments, summarizeScenario } from './budget';
import type { Budget, BudgetLine, Currency } from './schema';

let nextId = 0;
function line(
  name: string,
  unitPrice: number | null,
  currency: Currency,
  quantity: 'perGuest' | number,
  paid: number | null = null,
): BudgetLine {
  return {
    id: `l${nextId++}`,
    name,
    unitPrice,
    currency,
    quantity: quantity === 'perGuest' ? { kind: 'perGuest' } : { kind: 'fixed', count: quantity },
    paid,
    note: '',
  };
}

/** Exemplul din macheta aprobată. */
const mockup: Budget = {
  scenarios: [200, 260, 320],
  selected: 1,
  giftPerGuest: { amount: 220, currency: 'EUR' },
  familyGift: { amount: 0, currency: 'EUR' },
  lines: [
    line('Meniu', 120, 'EUR', 'perGuest', 3000),
    line('Băuturi', 15, 'EUR', 'perGuest'),
    line('Mărturii', 2, 'EUR', 'perGuest'),
    line('Meniu copil', 60, 'EUR', 8),
    line('Formație', 8000, 'EUR', 1, 1000),
    line('Foto-video', 3500, 'EUR', 1, 500),
    line('Flori și decor', 2000, 'EUR', 1),
    line('Păr și machiaj', 2500, 'RON', 1),
    line('Tort și candy bar', 1200, 'EUR', 1),
    line('Rochie', 1800, 'EUR', 1, 1800),
    line('Costum', 1000, 'EUR', 1),
    line('Verighete', 1600, 'EUR', 1, 1300),
  ],
};
const inEur = { eurRate: 5, currency: 'EUR' as const };

describe('summarizeScenario', () => {
  it('reproduce cifrele din machetă pentru cele trei scenarii', () => {
    const [s200, s260, s320] = mockup.scenarios.map((g) => summarizeScenario(mockup, g, inEur));

    expect(s200.total).toBe(47_480);
    expect(s260.total).toBe(55_700);
    expect(s320.total).toBe(63_920);

    expect(s200.balance).toBe(-3_480);
    expect(s260.balance).toBe(1_500);
    expect(s320.balance).toBe(6_480);

    expect(s200.breakEvenGift).toBeCloseTo(237.4);
    expect(s260.breakEvenGift).toBeCloseTo(214.23, 2);
    expect(s320.breakEvenGift).toBeCloseTo(199.75);
    expect(s260.perGuest).toBeCloseTo(s260.breakEvenGift);
  });

  it('afișează aceleași sume în lei când moneda de afișare e RON', () => {
    const s = summarizeScenario(mockup, 260, { eurRate: 5, currency: 'RON' });
    expect(s.total).toBe(278_500);
    expect(s.balance).toBe(7_500);
  });

  it('darul de la familie coboară darul de echilibru', () => {
    const budget: Budget = { ...mockup, familyGift: { amount: 10_000, currency: 'EUR' } };
    const s = summarizeScenario(budget, 260, inEur);
    expect(s.breakEvenGift).toBeCloseTo(45_700 / 260);
    expect(s.balance).toBe(11_500);
  });

  it('prețurile și darul necompletate contează ca 0', () => {
    const budget: Budget = {
      ...mockup,
      giftPerGuest: { amount: null, currency: 'EUR' },
      lines: [line('Meniu', 100, 'EUR', 'perGuest'), line('Formație', null, 'EUR', 1)],
    };
    const s = summarizeScenario(budget, 100, inEur);
    expect(s.total).toBe(10_000);
    expect(s.balance).toBe(-10_000);
  });

  it('nu împarte la zero', () => {
    const s = summarizeScenario(mockup, 0, inEur);
    expect(s.perGuest).toBe(0);
    expect(s.breakEvenGift).toBe(0);
  });
});

describe('summarizePayments', () => {
  it('reproduce plătit și rest din machetă', () => {
    const p = summarizePayments(mockup, 260, inEur);
    expect(p.total).toBe(55_700);
    expect(p.paid).toBe(7_600);
    expect(p.remaining).toBe(48_100);
  });

  it('o linie plătită peste total nu dă rest negativ', () => {
    const overpaid = line('Avans mare', 1000, 'EUR', 1, 1500);
    expect(lineRemaining(overpaid, 100)).toBe(0);
  });
});

describe('convert', () => {
  it('convertește în ambele sensuri', () => {
    expect(convert(100, 'EUR', 'RON', 5)).toBe(500);
    expect(convert(500, 'RON', 'EUR', 5)).toBe(100);
    expect(convert(42, 'RON', 'RON', 5)).toBe(42);
  });
});

describe('clearAmounts', () => {
  it('golește prețurile, plățile, darul și familia, dar păstrează structura', () => {
    const cleared = clearAmounts(mockup);
    expect(hasAmounts(mockup)).toBe(true);
    expect(hasAmounts(cleared)).toBe(false);

    expect(cleared.giftPerGuest).toEqual({ amount: null, currency: 'EUR' });
    expect(cleared.familyGift).toEqual({ amount: null, currency: 'EUR' });
    expect(cleared.lines.every((l) => l.unitPrice === null && l.paid === null)).toBe(true);

    expect(cleared.scenarios).toEqual(mockup.scenarios);
    expect(cleared.selected).toBe(mockup.selected);
    expect(cleared.lines.map((l) => [l.id, l.name, l.currency, l.quantity, l.note])).toEqual(
      mockup.lines.map((l) => [l.id, l.name, l.currency, l.quantity, l.note]),
    );
  });

  it('nu modifică bugetul primit', () => {
    clearAmounts(mockup);
    expect(mockup.lines[0].unitPrice).toBe(120);
    expect(mockup.giftPerGuest.amount).toBe(220);
  });
});
