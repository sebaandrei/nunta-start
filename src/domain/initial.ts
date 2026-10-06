import { budgetDefaults, taskTemplate } from '../content';
import type { AppData, BudgetLine, Task } from './schema';

export const DEFAULT_EUR_RATE = 5;
export const DEFAULT_GUESTS = 200;

export interface StartInput {
  weddingDate: string;
  names: [string, string];
  guests: number | null;
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createInitialData(input: StartInput, now: Date, makeId: () => string = newId): AppData {
  const iso = now.toISOString();
  return {
    settings: {
      weddingDate: input.weddingDate,
      names: input.names,
      eurRate: DEFAULT_EUR_RATE,
      displayCurrency: 'EUR',
    },
    tasks: taskTemplate().map(
      (tt): Task => ({
        id: makeId(),
        title: tt.title,
        category: tt.category,
        owner: 'both',
        status: 'todo',
        daysBefore: tt.daysBefore,
        manualDate: null,
        details: tt.details,
        note: '',
      }),
    ),
    budget: {
      scenarios: [input.guests ?? DEFAULT_GUESTS],
      selected: 0,
      giftPerGuest: { amount: null, currency: 'EUR' },
      familyGift: { amount: null, currency: 'EUR' },
      lines: budgetDefaults().map(
        (d): BudgetLine => ({
          id: makeId(),
          name: d.name,
          unitPrice: null,
          currency: d.currency,
          quantity: d.perGuest ? { kind: 'perGuest' } : { kind: 'fixed', count: 1 },
          paid: null,
          note: '',
        }),
      ),
    },
    meta: { createdAt: iso, lastChangedAt: iso, lastExportedAt: null },
  };
}

export function createTask(manualDate: string, makeId: () => string = newId): Task {
  return {
    id: makeId(),
    title: '',
    category: 'altele',
    owner: 'both',
    status: 'todo',
    daysBefore: null,
    manualDate,
    details: '',
    note: '',
  };
}

export function createBudgetLine(name: string, makeId: () => string = newId): BudgetLine {
  return {
    id: makeId(),
    name,
    unitPrice: null,
    currency: 'EUR',
    quantity: { kind: 'fixed', count: 1 },
    paid: null,
    note: '',
  };
}
