import { describe, expect, it } from 'vitest';
import {
  countLabel,
  decimalDisplay,
  decimalText,
  formatDate,
  formatMoney,
  formatNumber,
  formatShortDate,
  parseDecimal,
} from './format';

describe('formatarea în engleză', () => {
  it('data, numărul și moneda', () => {
    const d = new Date(2027, 8, 12);
    expect(formatDate(d, 'en')).toBe('12 September 2027');
    expect(formatShortDate(d, 'en')).toBe('12 Sep 2027');
    expect(formatNumber(55700, 'en')).toBe('55,700');
    expect(formatMoney(55700, 'EUR', 'en')).toBe('€55,700');
    expect(formatMoney(-500, 'RON', 'en')).toBe('−RON 500');
    expect(formatMoney(55700, 'RON', 'ro')).toBe('55.700 lei');
  });

  it('pluralul englezesc nu are „de"', () => {
    expect(countLabel(1, 'day', 'days', 'en')).toBe('1 day');
    expect(countLabel(20, 'day', 'days', 'en')).toBe('20 days');
    expect(countLabel(20, 'zi', 'zile', 'ro')).toBe('20 de zile');
  });

  it('câmpurile numerice folosesc punct zecimal și virgulă la mii', () => {
    expect(decimalDisplay(12345.5, 'en')).toBe('12,345.5');
    expect(decimalText(4.97, 'en')).toBe('4.97');
    expect(parseDecimal('4,500', 'en')).toBe(4500);
    expect(parseDecimal('12,345.50', 'en')).toBe(12345.5);
    expect(parseDecimal('4.97', 'en')).toBe(4.97);
    for (const v of [0, 5, 4500, 12345.5, 1250000, 4.97]) {
      expect(parseDecimal(decimalDisplay(v, 'en'), 'en')).toBe(v);
      expect(parseDecimal(decimalText(v, 'en'), 'en')).toBe(v);
    }
  });
});

describe('parseDecimal', () => {
  it('golul e null, textul invalid e undefined', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('  ')).toBeNull();
    expect(parseDecimal('abc')).toBeUndefined();
  });

  it('virgula e zecimală', () => {
    expect(parseDecimal('4,97')).toBe(4.97);
    expect(parseDecimal('120')).toBe(120);
  });

  it('punctul separă miile', () => {
    expect(parseDecimal('4.500')).toBe(4500);
    expect(parseDecimal('1.250.000')).toBe(1250000);
    expect(parseDecimal('12.345,50')).toBe(12345.5);
  });

  it('un singur punct fără grupe de 3 cifre e zecimal', () => {
    expect(parseDecimal('4.97')).toBe(4.97);
    expect(parseDecimal('4.5')).toBe(4.5);
  });

  it('spațiile sunt ignorate', () => {
    expect(parseDecimal('4 500')).toBe(4500);
  });
});

describe('afișarea în câmpuri', () => {
  it('cu separator de mii cât nu e editat', () => {
    expect(decimalDisplay(null)).toBe('');
    expect(decimalDisplay(4500)).toBe('4.500');
    expect(decimalDisplay(12345.5)).toBe('12.345,5');
    expect(decimalDisplay(4.97)).toBe('4,97');
    expect(decimalDisplay(120)).toBe('120');
  });

  it('fără separator la editare', () => {
    expect(decimalText(4500)).toBe('4500');
    expect(decimalText(4.97)).toBe('4,97');
  });

  it('ce se afișează se citește înapoi la fel', () => {
    for (const v of [0, 5, 120, 4500, 12345.5, 1250000, 4.97]) {
      expect(parseDecimal(decimalDisplay(v))).toBe(v);
      expect(parseDecimal(decimalText(v))).toBe(v);
    }
  });
});
