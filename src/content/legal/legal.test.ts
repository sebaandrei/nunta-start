import { describe, expect, it } from 'vitest';
import { legalEn } from './en';
import { legalRo } from './ro';

const docs = ['privacy', 'terms'] as const;

describe('legal content', () => {
  for (const doc of docs) {
    for (const [locale, content] of [
      ['ro', legalRo],
      ['en', legalEn],
    ] as const) {
      it(`${doc} (${locale}): unique ids, every section has heading and paragraphs`, () => {
        const sections = content[doc];
        const ids = sections.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const s of sections) {
          expect(s.id).toMatch(/^[a-z-]+$/);
          expect(s.heading.trim()).not.toBe('');
          expect(s.paragraphs.length).toBeGreaterThan(0);
          for (const p of s.paragraphs) expect(p.trim()).not.toBe('');
        }
      });
    }
    it(`${doc}: ro and en have identical ids in the same order`, () => {
      expect(legalEn[doc].map((s) => s.id)).toEqual(legalRo[doc].map((s) => s.id));
    });
  }
});
