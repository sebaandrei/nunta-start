import type { Owner } from './schema';

export const AGE_GROUPS = ['adult', 'child'] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const DIETS = ['classic', 'vegetarian', 'vegan'] as const;
export type Diet = (typeof DIETS)[number];

export const ATTENDING = ['unknown', 'yes', 'no'] as const;
export type Attending = (typeof ATTENDING)[number];

export type Household = { id: string; name: string; side: Owner; notes: string };
export type Guest = {
  id: string;
  householdId: string;
  firstName: string;
  lastName: string;
  ageGroup: AgeGroup;
  diet: Diet;
  attending: Attending;
};

export type GuestStats = {
  households: number;
  total: number;
  adults: number;
  children: number;
  bySide: Record<Owner, number>;
  byAttending: Record<Attending, number>;
  byDiet: Record<Diet, number>;
};

/** Numără persoanele; partea invitatului vine de la familia lui, un invitat fără familie nu intră la nicio parte. */
export function guestStats(households: Household[], guests: Guest[]): GuestStats {
  const sideOf = new Map(households.map((h) => [h.id, h.side]));
  const stats: GuestStats = {
    households: households.length,
    total: guests.length,
    adults: 0,
    children: 0,
    bySide: { p1: 0, p2: 0, both: 0 },
    byAttending: { unknown: 0, yes: 0, no: 0 },
    byDiet: { classic: 0, vegetarian: 0, vegan: 0 },
  };
  for (const guest of guests) {
    if (guest.ageGroup === 'child') stats.children++;
    else stats.adults++;
    const side = sideOf.get(guest.householdId);
    if (side) stats.bySide[side]++;
    stats.byAttending[guest.attending]++;
    stats.byDiet[guest.diet]++;
  }
  return stats;
}
