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

  it('budget leaf keys sit under the budget key and the list key is separate', () => {
    const w = keys.wedding('w1');
    for (const k of [w.budgetSettings(), w.budgetScenarios(), w.budgetLines()]) {
      expect(k.slice(0, 3)).toEqual([...w.budget()]);
    }
    expect(keys.list()).not.toEqual([...w.all]);
    expect(w.detail().slice(0, 2)).toEqual([...w.all]);
  });
});
