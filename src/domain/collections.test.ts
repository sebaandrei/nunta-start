import { describe, expect, it } from 'vitest';
import {
  applyPatch,
  type CollectionField,
  diffRecord,
  fieldKeyFor,
  formatFieldValue,
  ofCollection,
  parseOptions,
  validateRecord,
  withCheckboxDefaults,
  withoutEmpty,
} from './collections';

const field = (over: Partial<CollectionField>): CollectionField => ({
  id: 'f',
  collectionId: 'c',
  key: 'k',
  label: 'K',
  type: 'text',
  required: false,
  options: [],
  ...over,
});

describe('validateRecord', () => {
  it('accepts a valid record and optional fields left empty', () => {
    const fields = [field({ key: 'nume', required: true }), field({ key: 'pret', type: 'money' })];
    expect(validateRecord(fields, { nume: 'Foto' })).toEqual({});
    expect(validateRecord(fields, { nume: 'Foto', pret: null })).toEqual({});
  });

  it('rejects a missing, null or empty required value like the DB trigger', () => {
    const fields = [field({ key: 'nume', required: true })];
    for (const data of [{}, { nume: null }, { nume: '' }]) {
      expect(validateRecord(fields, data)).toEqual({ nume: 'required' });
    }
  });

  it('treats false as a value for a required checkbox', () => {
    expect(validateRecord([field({ key: 'ok', type: 'checkbox', required: true })], { ok: false })).toEqual({});
  });

  it('checks the type of each field', () => {
    const fields = [
      field({ key: 'n', type: 'number' }),
      field({ key: 'm', type: 'money' }),
      field({ key: 'd', type: 'date' }),
      field({ key: 'l', type: 'link' }),
      field({ key: 'c', type: 'choice', options: ['a', 'b'] }),
      field({ key: 'b', type: 'checkbox' }),
      field({ key: 't', type: 'text' }),
      field({ key: 'p', type: 'person' }),
    ];
    expect(
      validateRecord(fields, { n: '5', m: Number.NaN, d: '2026-02-30', l: 'ftp://x', c: 'z', b: 'true', t: 1, p: 2 }),
    ).toEqual({
      n: 'number',
      m: 'number',
      d: 'date',
      l: 'link',
      c: 'choice',
      b: 'invalid',
      t: 'invalid',
      p: 'invalid',
    });
    expect(
      validateRecord(fields, {
        n: 5,
        m: 10.5,
        d: '2026-10-10',
        l: 'https://exemplu.ro/x',
        c: 'a',
        b: true,
        t: 'x',
        p: 'Ana',
      }),
    ).toEqual({});
  });
});

describe('withoutEmpty', () => {
  it('drops null, empty and missing values but keeps false and 0', () => {
    expect(withoutEmpty({ a: '', b: null, c: undefined, d: false, e: 0, f: 'x' })).toEqual({ d: false, e: 0, f: 'x' });
  });
});

describe('fieldKeyFor', () => {
  it('builds a key the DB accepts, without diacritics', () => {
    expect(fieldKeyFor('Preț total', [])).toBe('pret_total');
    expect(fieldKeyFor('  Dată / oră! ', [])).toBe('data_ora');
  });

  it('starts with a letter and is never empty', () => {
    expect(fieldKeyFor('2 mese', [])).toBe('f_2_mese');
    expect(fieldKeyFor('???', [])).toBe('camp');
  });

  it('is unique among the keys taken', () => {
    expect(fieldKeyFor('Nume', ['nume', 'nume_2'])).toBe('nume_3');
  });
});

describe('parseOptions', () => {
  it('splits on commas, trims and drops blanks and duplicates', () => {
    expect(parseOptions(' Da, Nu,, da , Nu ')).toEqual(['Da', 'Nu', 'da']);
  });
});

describe('ofCollection', () => {
  it('keeps one collection, in position order', () => {
    const items = [
      { id: 'a', collectionId: 'c', position: 20 },
      { id: 'b', collectionId: 'x', position: 0 },
      { id: 'c', collectionId: 'c', position: 10 },
    ];
    expect(ofCollection(items, 'c').map((i) => i.id)).toEqual(['c', 'a']);
  });
});

describe('formatFieldValue', () => {
  it('formats by type', () => {
    expect(formatFieldValue(field({ type: 'money' }), 1250, 'RON')).toMatch(/1\.250|1,250/);
    expect(formatFieldValue(field({ type: 'date' }), '2026-10-10', 'RON')).toMatch(/10/);
    expect(formatFieldValue(field({ type: 'number' }), 3, 'RON')).toBe('3');
    expect(formatFieldValue(field({ type: 'text' }), 'Foto', 'RON')).toBe('Foto');
  });

  it('is empty for missing values, checkboxes and values of the wrong type', () => {
    expect(formatFieldValue(field({}), null, 'RON')).toBe('');
    expect(formatFieldValue(field({ type: 'checkbox' }), true, 'RON')).toBe('');
    expect(formatFieldValue(field({ type: 'number' }), 'abc', 'RON')).toBe('');
  });
});

describe('diffRecord / applyPatch', () => {
  it('lists only the keys that changed, with null for cleared ones', () => {
    const base = { nume: 'Foto', tel: '0722', nota: 'avans' };
    expect(diffRecord(base, { nume: 'Foto', tel: '0733' })).toEqual({ tel: '0733', nota: null });
  });

  it('treats empty values as missing', () => {
    expect(diffRecord({ nota: '' }, {})).toEqual({});
    expect(diffRecord({}, { nota: '' })).toEqual({});
  });

  it("keeps another person's edit when the draft only changed a different key", () => {
    const opened = { nume: 'Foto', tel: '0722' };
    const draft = { nume: 'Foto Studio', tel: '0722' };
    const patch = diffRecord(opened, draft);
    // someone else changed `tel` while the sheet was open
    expect(applyPatch({ nume: 'Foto', tel: '0799' }, patch)).toEqual({ nume: 'Foto Studio', tel: '0799' });
  });

  it('applyPatch drops cleared keys', () => {
    expect(applyPatch({ a: 1, b: 2 }, { b: null })).toEqual({ a: 1 });
  });
});

describe('withCheckboxDefaults', () => {
  const box = (key: string, required: boolean) => field({ key, label: key, type: 'checkbox', required });

  it('turns a missing required checkbox into false, so it validates', () => {
    const fields = [box('confirmat', true)];
    expect(validateRecord(fields, {})).toEqual({ confirmat: 'required' });
    expect(validateRecord(fields, withCheckboxDefaults(fields, {}))).toEqual({});
  });

  it('leaves optional checkboxes and existing values alone', () => {
    const fields = [box('a', false), box('b', true)];
    expect(withCheckboxDefaults(fields, { b: true })).toEqual({ b: true });
    expect(withCheckboxDefaults(fields, {})).toEqual({ b: false });
  });
});
