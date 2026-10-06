import type { Currency } from '../domain/schema';
import { currentLocale, type Locale } from './locale';

const MONTHS_RO = [
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
const MONTHS_SHORT_RO = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sept', 'oct', 'nov', 'dec'];
const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTHS_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Separatorii de mii și zecimale: ro-RO „4.500,5", en-GB „4,500.5". */
const SEPARATORS: Record<Locale, { group: string; decimal: string }> = {
  ro: { group: '.', decimal: ',' },
  en: { group: ',', decimal: '.' },
};

function group(digits: string, locale: Locale): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, SEPARATORS[locale].group);
}

export function formatDate(date: Date, locale: Locale = currentLocale()): string {
  const months = locale === 'en' ? MONTHS_EN : MONTHS_RO;
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatShortDate(date: Date, locale: Locale = currentLocale()): string {
  const months = locale === 'en' ? MONTHS_SHORT_EN : MONTHS_SHORT_RO;
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/** Întreg rotunjit, cu separator la mii (ro 55.700, en 55,700) și minus tipografic. */
export function formatNumber(value: number, locale: Locale = currentLocale()): string {
  const rounded = Math.round(Math.abs(value));
  const grouped = group(String(rounded), locale);
  return value < 0 && rounded !== 0 ? `−${grouped}` : grouped;
}

export function currencySymbol(currency: Currency, locale: Locale = currentLocale()): string {
  if (currency === 'EUR') return '€';
  return locale === 'en' ? 'RON' : 'lei';
}

export function formatMoney(value: number, currency: Currency, locale: Locale = currentLocale()): string {
  const symbol = currencySymbol(currency, locale);
  if (locale === 'ro') return `${formatNumber(value, locale)} ${symbol}`;
  // en: „€55,700", „RON 55,700"; minusul stă în fața simbolului.
  const amount = formatNumber(Math.abs(value), locale);
  const sign = Math.round(value) < 0 ? '−' : '';
  return `${sign}${symbol}${currency === 'EUR' ? '' : ' '}${amount}`;
}

export function formatSignedMoney(value: number, currency: Currency, locale: Locale = currentLocale()): string {
  return Math.round(value) > 0 ? `+${formatMoney(value, currency, locale)}` : formatMoney(value, currency, locale);
}

/**
 * Numărul cu substantivul la plural românesc:
 * 1 zi · 5 zile · 20 de zile · 101 zile · 342 de zile.
 * În engleză: 1 day · 5 days.
 */
export function countLabel(n: number, singular: string, plural: string, locale: Locale = currentLocale()): string {
  const shown = formatNumber(n, locale);
  if (Math.abs(n) === 1) return `${shown} ${singular}`;
  if (locale === 'en') return `${shown} ${plural}`;
  const rest = Math.abs(n) % 100;
  const needsDe = n !== 0 && (rest === 0 || rest >= 20);
  return needsDe ? `${shown} de ${plural}` : `${shown} ${plural}`;
}

/** Textul afișat într-un câmp numeric: separatorul zecimal al limbii, gol pentru null. */
export function decimalText(value: number | null, locale: Locale = currentLocale()): string {
  return value === null ? '' : String(value).replace('.', SEPARATORS[locale].decimal);
}

/** Numărul afișat într-un câmp când nu e editat: ro „4.500", „4,97"; en „4,500", „4.97". */
export function decimalDisplay(value: number | null, locale: Locale = currentLocale()): string {
  if (value === null) return '';
  const [int, frac] = String(Math.abs(value)).split('.');
  return `${value < 0 ? '-' : ''}${group(int, locale)}${frac ? `${SEPARATORS[locale].decimal}${frac}` : ''}`;
}

/**
 * null pentru câmp gol, undefined pentru text care nu e număr.
 * ro: virgula e zecimală. Punctul separă miile („4.500", „12.345,50"), în afară de cazul
 * în care e singurul separator și nu urmează grupe de câte 3 cifre („4.97").
 * en: invers, punctul e zecimal, iar virgula separă miile („4,500", „12,345.50").
 */
export function parseDecimal(text: string, locale: Locale = currentLocale()): number | null | undefined {
  let cleaned = text.trim().replace(/\s/g, '');
  if (cleaned === '') return null;
  if (locale === 'en') {
    if (cleaned.includes('.') || /^-?\d{1,3}(,\d{3})+$/.test(cleaned)) cleaned = cleaned.replace(/,/g, '');
    else cleaned = cleaned.replace(',', '.');
  } else if (cleaned.includes(',') || /^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}
