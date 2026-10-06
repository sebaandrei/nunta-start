import { describe, expect, it } from 'vitest';
import { addGodparentPair, MAX_GODPARENT_PAIRS, removeGodparentPair, updateGodparentPair } from './godparents';
import type { GodparentPair } from './schema';

const two: GodparentPair[] = [
  { godmother: 'A', godfather: 'B' },
  { godmother: 'C', godfather: 'D' },
];

describe('godparent list', () => {
  it('adds an empty pair without mutating the input', () => {
    const list = [two[0]];
    expect(addGodparentPair(list)).toEqual([two[0], { godmother: '', godfather: '' }]);
    expect(list).toHaveLength(1);
  });

  it('stops at the maximum', () => {
    let list: GodparentPair[] = [];
    for (let i = 0; i < MAX_GODPARENT_PAIRS + 2; i++) list = addGodparentPair(list);
    expect(list).toHaveLength(MAX_GODPARENT_PAIRS);
  });

  it('updates only the targeted pair', () => {
    expect(updateGodparentPair(two, 1, { godfather: 'X' })).toEqual([two[0], { godmother: 'C', godfather: 'X' }]);
  });

  it('removes by index and ignores an unknown index', () => {
    expect(removeGodparentPair(two, 0)).toEqual([two[1]]);
    expect(removeGodparentPair(two, 5)).toEqual(two);
  });
});
