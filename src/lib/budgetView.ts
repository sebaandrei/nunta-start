import { convert, lineRemaining, lineTotal, type Rates } from '../domain/budget';
import type { BudgetLine } from '../domain/schema';

export interface LineView {
  /** Toate sumele sunt în moneda de afișare. */
  total: number;
  paid: number;
  remaining: number;
  /** Cât din total e plătit, între 0 și 1 (0 când totalul e 0). */
  paidRatio: number;
}

/** Valorile unei linii, convertite în moneda de afișare, pentru cardul de pe telefon. */
export function lineView(line: BudgetLine, guests: number, rates: Rates): LineView {
  const toDisplay = (amount: number) => convert(amount, line.currency, rates.currency, rates.eurRate);
  const total = toDisplay(lineTotal(line, guests));
  const paid = toDisplay(line.paid ?? 0);
  return {
    total,
    paid,
    remaining: toDisplay(lineRemaining(line, guests)),
    paidRatio: total > 0 ? Math.min(1, Math.max(0, paid / total)) : 0,
  };
}
