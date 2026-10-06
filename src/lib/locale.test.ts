import { describe, expect, it } from 'vitest';
import { applyLocale, parseLocale, resolveInitialLocale } from './locale';

describe('parseLocale', () => {
  it('acceptă ro și en', () => {
    expect(parseLocale('ro')).toBe('ro');
    expect(parseLocale('en')).toBe('en');
  });

  it('valorile necunoscute devin ro', () => {
    for (const raw of [null, undefined, '', 'EN', 'fr', 'en-GB', 1]) {
      expect(parseLocale(raw)).toBe('ro');
    }
  });
});

describe('resolveInitialLocale', () => {
  it('limba salvată are prioritate', () => {
    expect(resolveInitialLocale('ro', 'en-US')).toBe('ro');
    expect(resolveInitialLocale('en', 'ro-RO')).toBe('en');
  });

  it('fără valoare salvată urmează limba browserului', () => {
    expect(resolveInitialLocale(null, 'en-GB')).toBe('en');
    expect(resolveInitialLocale(null, 'EN')).toBe('en');
    expect(resolveInitialLocale(null, 'ro-RO')).toBe('ro');
    expect(resolveInitialLocale(null, 'fr')).toBe('ro');
    expect(resolveInitialLocale(null, undefined)).toBe('ro');
  });

  it('o valoare salvată necunoscută cade pe ro', () => {
    expect(resolveInitialLocale('fr', 'en-US')).toBe('ro');
  });
});

describe('applyLocale', () => {
  it('setează atributul lang', () => {
    const root = { lang: 'ro' };
    applyLocale('en', root);
    expect(root.lang).toBe('en');
  });
});
