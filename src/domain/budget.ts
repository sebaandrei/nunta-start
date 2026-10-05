import type { Budget, BudgetLine, Currency } from './schema';

export interface Rates {
  /** Câți lei face 1 €. */
  eurRate: number;
  /** Moneda în care se afișează totalurile. */
  currency: Currency;
}

export interface ScenarioSummary {
  guests: number;
  total: number;
  perGuest: number;
  breakEvenGift: number;
  income: number;
  balance: number;
}

export interface PaymentSummary {
  total: number;
  paid: number;
  remaining: number;
}

export function convert(amount: number, from: Currency, to: Currency, eurRate: number): number {
  if (from === to) return amount;
  return from === 'EUR' ? amount * eurRate : amount / eurRate;
}

export function lineQuantity(line: BudgetLine, guests: number): number {
  return line.quantity.kind === 'perGuest' ? guests : line.quantity.count;
}

/** Totalul liniei, în moneda liniei. Prețul necompletat contează ca 0. */
export function lineTotal(line: BudgetLine, guests: number): number {
  return (line.unitPrice ?? 0) * lineQuantity(line, guests);
}

/** Cât mai e de plătit pe linie, în moneda liniei. Nu coboară sub zero. */
export function lineRemaining(line: BudgetLine, guests: number): number {
  return Math.max(0, lineTotal(line, guests) - (line.paid ?? 0));
}

export function summarizeScenario(budget: Budget, guests: number, rates: Rates): ScenarioSummary {
  const { eurRate, currency } = rates;
  const total = sum(budget.lines.map((l) => convert(lineTotal(l, guests), l.currency, currency, eurRate)));
  const family = convert(budget.familyGift.amount ?? 0, budget.familyGift.currency, currency, eurRate);
  const gift = convert(budget.giftPerGuest.amount ?? 0, budget.giftPerGuest.currency, currency, eurRate);
  const income = gift * guests + family;
  return {
    guests,
    total,
    perGuest: guests > 0 ? total / guests : 0,
    breakEvenGift: guests > 0 ? Math.max(0, (total - family) / guests) : 0,
    income,
    balance: income - total,
  };
}

export function summarizePayments(budget: Budget, guests: number, rates: Rates): PaymentSummary {
  const { eurRate, currency } = rates;
  const inDisplay = (amount: number, line: BudgetLine) => convert(amount, line.currency, currency, eurRate);
  return {
    total: sum(budget.lines.map((l) => inDisplay(lineTotal(l, guests), l))),
    paid: sum(budget.lines.map((l) => inDisplay(l.paid ?? 0, l))),
    remaining: sum(budget.lines.map((l) => inDisplay(lineRemaining(l, guests), l))),
  };
}

export function selectedGuests(budget: Budget): number {
  return budget.scenarios[Math.min(budget.selected, budget.scenarios.length - 1)];
}

export function hasPrices(budget: Budget): boolean {
  return budget.lines.some((l) => (l.unitPrice ?? 0) > 0);
}

/** Există vreo sumă scrisă (preț, plătit, dar, familie)? */
export function hasAmounts(budget: Budget): boolean {
  return (
    budget.giftPerGuest.amount !== null ||
    budget.familyGift.amount !== null ||
    budget.lines.some((l) => l.unitPrice !== null || l.paid !== null)
  );
}

/** Golește toate sumele. Liniile, tipurile, bucățile, observațiile și scenariile rămân. */
export function clearAmounts(budget: Budget): Budget {
  return {
    ...budget,
    giftPerGuest: { ...budget.giftPerGuest, amount: null },
    familyGift: { ...budget.familyGift, amount: null },
    lines: budget.lines.map((l) => ({ ...l, unitPrice: null, paid: null })),
  };
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
