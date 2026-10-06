import { describe, expect, it } from 'vitest';
import { keys } from './queryKeys';

describe('keys', () => {
  it('scopes every key under the wedding id', () => {
    const w = keys.wedding('w1');
    for (const k of [w.tasks(), w.budget(), w.guests(), w.members()]) {
      expect(k.slice(0, 2)).toEqual(['weddings', 'w1']);
    }
  });

  it('keeps weddings separate', () => {
    expect(keys.wedding('a').tasks()).not.toEqual(keys.wedding('b').tasks());
  });

  it('gives each resource a distinct key', () => {
    const w = keys.wedding('w1');
    const all = [w.tasks(), w.budget(), w.guests(), w.members()].map((k) => k.join('/'));
    expect(new Set(all).size).toBe(all.length);
  });

  it('wedding.all is a prefix of its resource keys', () => {
    expect(keys.wedding('w1').tasks().slice(0, 2)).toEqual([...keys.wedding('w1').all]);
  });
});
