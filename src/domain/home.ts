import { daysBetween } from './dates';

export type Countdown =
  | { kind: 'future'; days: number }
  | { kind: 'tomorrow'; days: 1 }
  | { kind: 'today'; days: 0 }
  | { kind: 'past'; days: number };

/** Zilele rămase până la nuntă, ca stare de afișat; `days` din „past" e numărul de zile de la nuntă. */
export function countdown(wedding: Date, today: Date): Countdown {
  const left = daysBetween(today, wedding);
  if (left > 1) return { kind: 'future', days: left };
  if (left === 1) return { kind: 'tomorrow', days: 1 };
  if (left === 0) return { kind: 'today', days: 0 };
  return { kind: 'past', days: -left };
}

/** Procentul plătit din total, 0–100; fără total: 0. */
export function paidPercent(paid: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((paid / total) * 100)));
}

/** Data nunții urmată de oraș, când e completat: „Sâmbătă, 23 ianuarie 2027 · Brașov". */
export function withCity(dateText: string, city: string): string {
  const name = city.trim();
  return name ? `${dateText} · ${name}` : dateText;
}

/** Prima literă mare („sâmbătă, 23 ianuarie" devine „Sâmbătă, 23 ianuarie"). */
export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}
