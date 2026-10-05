import type { Currency } from '../domain/schema';

const MONTHS = [
  'ianuarie',
  'februarie',
  'martie',
  'aprilie',
  'mai',
  'iunie',
  'iulie',
  'august',
  'septembrie',
  'octombrie',
  'noiembrie',
  'decembrie',
];
const MONTHS_SHORT = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sept', 'oct', 'nov', 'dec'];

export function formatDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatShortDate(date: Date): string {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

/** Întreg rotunjit, cu punct la mii (55.700) și minus tipografic. */
export function formatNumber(value: number): string {
  const rounded = Math.round(Math.abs(value));
  const grouped = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return value < 0 && rounded !== 0 ? `−${grouped}` : grouped;
}

export function currencySymbol(currency: Currency): string {
  return currency === 'EUR' ? '€' : 'lei';
}

export function formatMoney(value: number, currency: Currency): string {
  return `${formatNumber(value)} ${currencySymbol(currency)}`;
}

export function formatSignedMoney(value: number, currency: Currency): string {
  return Math.round(value) > 0 ? `+${formatMoney(value, currency)}` : formatMoney(value, currency);
}

/**
 * Numărul cu substantivul la plural românesc:
 * 1 zi · 5 zile · 20 de zile · 101 zile · 342 de zile.
 */
export function countLabel(n: number, singular: string, plural: string): string {
  const shown = formatNumber(n);
  if (Math.abs(n) === 1) return `${shown} ${singular}`;
  const rest = Math.abs(n) % 100;
  const needsDe = n !== 0 && (rest === 0 || rest >= 20);
  return needsDe ? `${shown} de ${plural}` : `${shown} ${plural}`;
}

/** Textul afișat într-un câmp numeric: virgulă zecimală, gol pentru null. */
export function decimalText(value: number | null): string {
  return value === null ? '' : String(value).replace('.', ',');
}

/** Numărul afișat într-un câmp când nu e editat: „4.500", „4,97". */
export function decimalDisplay(value: number | null): string {
  if (value === null) return '';
  const [int, frac] = String(Math.abs(value)).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${value < 0 ? '-' : ''}${grouped}${frac ? `,${frac}` : ''}`;
}

/**
 * null pentru câmp gol, undefined pentru text care nu e număr.
 * Virgula e zecimală. Punctul separă miile („4.500", „12.345,50"), în afară de cazul
 * în care e singurul separator și nu urmează grupe de câte 3 cifre („4.97").
 */
export function parseDecimal(text: string): number | null | undefined {
  let cleaned = text.trim().replace(/\s/g, '');
  if (cleaned === '') return null;
  if (cleaned.includes(',') || /^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}
