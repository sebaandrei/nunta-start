import { type RsvpClient, type RsvpHousehold, RsvpNotFoundError } from './rsvp';

/**
 * Doar pentru teste unitare și pentru previzualizarea din dev (`/r/x?preview=…`), cât timp funcția
 * `rsvp` (NS-081) nu există. Ecranul o importă numai sub `import.meta.env.DEV`.
 */
export const PREVIEW_HOUSEHOLD: RsvpHousehold = {
  householdName: 'Familia Popescu',
  weddingName: 'Ana & Mihai',
  guests: [
    { id: 'g1', name: 'Ion Popescu', ageGroup: 'adult', attending: 'unknown', diet: 'classic' },
    { id: 'g2', name: 'Maria Popescu', ageGroup: 'adult', attending: 'unknown', diet: 'vegetarian' },
    { id: 'g3', name: 'Andrei Popescu', ageGroup: 'child', attending: 'unknown', diet: 'classic' },
  ],
  note: '',
};

export type RsvpPreviewName = 'valid' | 'notFound' | 'error';

export function parseRsvpPreview(raw: string | null): RsvpPreviewName | null {
  return raw === 'valid' || raw === 'notFound' || raw === 'error' ? raw : null;
}

export function createFakeRsvpClient(name: RsvpPreviewName = 'valid'): RsvpClient {
  return {
    fetchHousehold: () =>
      name === 'notFound'
        ? Promise.reject(new RsvpNotFoundError())
        : name === 'error'
          ? Promise.reject(new TypeError('network'))
          : Promise.resolve(PREVIEW_HOUSEHOLD),
    submitRsvp: () => Promise.resolve(),
  };
}
