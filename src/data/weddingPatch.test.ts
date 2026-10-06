import { describe, expect, it } from 'vitest';
import { applyWeddingUpdate, type Wedding, weddingPatchToUpdate } from './mappers';

const wedding: Wedding = {
  id: 'w1',
  name: 'Ana & Mihai',
  date: '2027-06-12',
  city: 'Brașov',
  partner1: 'Ana',
  partner2: 'Mihai',
  eurRate: 5,
  displayCurrency: 'EUR',
  godparents: [{ godmother: 'Maria', godfather: 'Ion' }],
  role: 'owner',
};

describe('weddingPatchToUpdate', () => {
  it('sends nothing when nothing changed', () => {
    expect(
      weddingPatchToUpdate(wedding, { date: '2027-06-12', city: 'Brașov', eurRate: 5, partner1: ' Ana ' }),
    ).toEqual({});
    expect(weddingPatchToUpdate(wedding, { godparents: [{ godmother: 'Maria', godfather: 'Ion' }] })).toEqual({});
  });

  it('sends only the changed columns', () => {
    expect(weddingPatchToUpdate(wedding, { date: '2027-07-01', displayCurrency: 'RON' })).toEqual({
      wedding_date: '2027-07-01',
      display_currency: 'RON',
    });
  });

  it('turns an empty city into null and keeps null when already null', () => {
    expect(weddingPatchToUpdate(wedding, { city: '  ' })).toEqual({ city: null });
    expect(weddingPatchToUpdate({ ...wedding, city: null }, { city: '' })).toEqual({});
  });

  it('rounds the rate to 4 decimals and ignores non-positive rates', () => {
    expect(weddingPatchToUpdate(wedding, { eurRate: 4.97123 })).toEqual({ eur_rate: 4.9712 });
    expect(weddingPatchToUpdate(wedding, { eurRate: 0 })).toEqual({});
    expect(weddingPatchToUpdate(wedding, { eurRate: -3 })).toEqual({});
  });

  it('keeps at most 5 godparent pairs', () => {
    const six = Array.from({ length: 6 }, (_, i) => ({ godmother: `m${i}`, godfather: `f${i}` }));
    expect(weddingPatchToUpdate(wedding, { godparents: six }).godparents).toHaveLength(5);
  });

  it('renames the wedding after the partners only while the name was generated from them', () => {
    expect(weddingPatchToUpdate(wedding, { partner2: 'Mihnea' })).toEqual({
      partner2_name: 'Mihnea',
      name: 'Ana & Mihnea',
    });
    expect(weddingPatchToUpdate({ ...wedding, name: 'Nunta noastră' }, { partner2: 'Mihnea' })).toEqual({
      partner2_name: 'Mihnea',
    });
    expect(weddingPatchToUpdate(wedding, { partner2: 'Mihnea', name: 'Alt nume' }).name).toBe('Alt nume');
  });
});

describe('applyWeddingUpdate', () => {
  it('applies the same values the server receives and leaves the rest', () => {
    const update = weddingPatchToUpdate(wedding, { date: '2027-07-01', city: '', eurRate: 4.97123 });
    expect(applyWeddingUpdate(wedding, update)).toEqual({
      ...wedding,
      date: '2027-07-01',
      city: null,
      eurRate: 4.9712,
    });
  });

  it('applies godparents and an explicit null date', () => {
    const update = weddingPatchToUpdate(wedding, { godparents: [], date: null });
    expect(applyWeddingUpdate(wedding, update)).toMatchObject({ godparents: [], date: null });
  });
});
