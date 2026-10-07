import type { AgeGroup, Attending, Diet } from '../domain/guests';
import type { Messages } from '../i18n';

/**
 * Contractul cu Edge Function-ul `rsvp` (NS-081, încă nepublicat). Pagina `/r/:token` (NS-082) e scrisă peste el:
 *
 *   GET  rsvp/<token>  ->  200 RsvpHousehold | 404 (token necunoscut)
 *   POST rsvp/<token>  body RsvpSubmission  ->  204 | 404 | 400 (răspuns invalid) | 403 (Turnstile) | 429 (prea multe cereri)
 */
export interface RsvpGuest {
  id: string;
  /** Numele întreg, așa cum îl vede familia. */
  name: string;
  ageGroup: AgeGroup;
  /** Răspunsul dat deja (`unknown` = încă nimic), ca familia să-l poată corecta. */
  attending: Attending;
  diet: Diet;
}

export interface RsvpHousehold {
  /** Numele familiei, de ex. „Familia Popescu". */
  householdName: string;
  /** Numele celor care se căsătoresc, pentru titlu; gol dacă nu se cunosc. */
  weddingName: string;
  guests: RsvpGuest[];
  /** Nota lăsată anterior. */
  note: string;
}

export interface RsvpAnswer {
  guestId: string;
  attending: 'yes' | 'no';
  diet: Diet;
}

export interface RsvpSubmission {
  answers: RsvpAnswer[];
  /** O singură notă pentru toată familia. */
  note: string;
  /** TODO(NS-081): tokenul Turnstile; lipsește cât timp widgetul nu există. */
  turnstileToken?: string;
}

export interface RsvpClient {
  fetchHousehold(token: string): Promise<RsvpHousehold>;
  submitRsvp(token: string, submission: RsvpSubmission): Promise<void>;
}

/** Tokenul nu corespunde nicio familie (404). */
export class RsvpNotFoundError extends Error {
  constructor() {
    super('RSVP token not found');
    this.name = 'RsvpNotFoundError';
  }
}

/** Funcția `rsvp` nu e configurată sau publicată încă. */
export class RsvpNotConfiguredError extends Error {
  constructor() {
    super('RSVP is not configured');
    this.name = 'RsvpNotConfiguredError';
  }
}

/** Serverul a refuzat trimiterea (verificare anti-bot, prea multe cereri). */
export class RsvpRejectedError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`RSVP rejected (${status})`);
    this.name = 'RsvpRejectedError';
    this.status = status;
  }
}

export const notConfiguredRsvpClient: RsvpClient = {
  fetchHousehold: () => Promise.reject(new RsvpNotConfiguredError()),
  submitRsvp: () => Promise.reject(new RsvpNotConfiguredError()),
};

export type RsvpErrorKind = 'notFound' | 'notConfigured' | 'rejected' | 'network' | 'generic';

export function rsvpErrorKind(error: unknown): RsvpErrorKind {
  if (error instanceof RsvpNotFoundError) return 'notFound';
  if (error instanceof RsvpNotConfiguredError) return 'notConfigured';
  if (error instanceof RsvpRejectedError) return 'rejected';
  if (error instanceof TypeError) return 'network';
  return 'generic';
}

export function rsvpErrorMessage(kind: Exclude<RsvpErrorKind, 'notFound'>, t: Messages): string {
  return t.rsvp.errors[kind];
}
