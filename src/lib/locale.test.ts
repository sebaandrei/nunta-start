import { describe, expect, it } from 'vitest';
import { applyLocale, parseLocale } from './locale';

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

describe('applyLocale', () => {
  it('setează atributul lang', () => {
    const root = { lang: 'ro' };
    applyLocale('en', root);
    expect(root.lang).toBe('en');
  });
});
