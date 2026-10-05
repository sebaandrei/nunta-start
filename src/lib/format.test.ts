import { describe, expect, it } from 'vitest';
import { decimalDisplay, decimalText, parseDecimal } from './format';

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
