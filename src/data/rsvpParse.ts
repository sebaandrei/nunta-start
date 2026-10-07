import { AGE_GROUPS, ATTENDING, DIETS } from '../domain/guests';
import type { RsvpHousehold } from '../lib/rsvp';

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Răspunsul GET al funcției `rsvp` în forma paginii; o valoare necunoscută cade pe cea mai prudentă. */
export function rsvpHouseholdFromJson(json: unknown): RsvpHousehold {
  const o = typeof json === 'object' && json !== null ? (json as Record<string, unknown>) : {};
  const guests = Array.isArray(o.guests) ? o.guests : [];
  return {
    householdName: str(o.householdName),
    weddingName: str(o.weddingName),
    note: str(o.note),
    guests: guests.flatMap((g) => {
      const r = typeof g === 'object' && g !== null ? (g as Record<string, unknown>) : {};
      const id = str(r.id);
      if (!id) return [];
      return [
        {
          id,
          name: str(r.name),
          ageGroup: AGE_GROUPS.find((a) => a === r.ageGroup) ?? 'adult',
          attending: ATTENDING.find((a) => a === r.attending) ?? 'unknown',
          diet: DIETS.find((d) => d === r.diet) ?? 'classic',
        },
      ];
    }),
  };
}
