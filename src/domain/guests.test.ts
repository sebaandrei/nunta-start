import { describe, expect, it } from 'vitest';
import { type Guest, guestStats, type Household } from './guests';

const households: Household[] = [
  { id: 'h1', name: 'Popescu', side: 'p1', notes: '' },
  { id: 'h2', name: 'Ionescu', side: 'p2', notes: '' },
  { id: 'h3', name: 'Prieteni', side: 'both', notes: '' },
];

function guest(id: string, householdId: string, patch: Partial<Guest> = {}): Guest {
  return {
    id,
    householdId,
    firstName: id,
    lastName: '',
    ageGroup: 'adult',
    diet: 'classic',
    attending: 'unknown',
    ...patch,
  };
}

describe('guestStats', () => {
  it('is all zeros for empty lists', () => {
    expect(guestStats([], [])).toEqual({
      households: 0,
      total: 0,
      adults: 0,
      children: 0,
      bySide: { p1: 0, p2: 0, both: 0 },
      byAttending: { unknown: 0, yes: 0, no: 0 },
      byDiet: { classic: 0, vegetarian: 0, vegan: 0 },
    });
  });

  it('counts households without guests', () => {
    const stats = guestStats(households, []);
    expect(stats.households).toBe(3);
    expect(stats.total).toBe(0);
  });

  it('splits by age group, side, attending and diet', () => {
    const stats = guestStats(households, [
      guest('a', 'h1', { attending: 'yes', diet: 'vegan' }),
      guest('b', 'h1', { ageGroup: 'child', attending: 'yes' }),
      guest('c', 'h2', { attending: 'no', diet: 'vegetarian' }),
      guest('d', 'h3'),
    ]);
    expect(stats.total).toBe(4);
    expect(stats.adults).toBe(3);
    expect(stats.children).toBe(1);
    expect(stats.bySide).toEqual({ p1: 2, p2: 1, both: 1 });
    expect(stats.byAttending).toEqual({ unknown: 1, yes: 2, no: 1 });
    expect(stats.byDiet).toEqual({ classic: 2, vegetarian: 1, vegan: 1 });
  });

  it('counts a guest of an unknown household in the total but not in any side', () => {
    const stats = guestStats(households, [guest('x', 'missing')]);
    expect(stats.total).toBe(1);
    expect(stats.bySide).toEqual({ p1: 0, p2: 0, both: 0 });
  });
});
