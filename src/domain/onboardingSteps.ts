import { isValidISODate } from './dates';
import type { StartInput } from './initial';

export const STEPS = ['about', 'wedding', 'done'] as const;
export type StepId = (typeof STEPS)[number];

export interface OnboardingValues {
  name1: string;
  name2: string;
  date: string;
  city: string;
  /** Textul din câmp, neschimbat: se validează abia la pas. Gol = nespecificat. */
  guests: string;
}

/**
 * Limitele din RPC-ul `public.create_wedding` (supabase/migrations/20261006150000_create_wedding_negative_days.sql,
 * ultima versiune a funcției) și din constrângerea `weddings.city` (20261006110000_wedding_city_godparents.sql).
 * Baza de date numără caractere (char_length), nu octeți. La schimbarea lor, se schimbă și migrarea.
 */
export const PARTNER_NAME_MAX = 80;
export const WEDDING_NAME_MAX = 120;
export const CITY_MAX = 120;
/** Un scenariu are 1-6 cifre (`^[0-9]{1,6}$`), deci cel mult 999999. */
export const GUESTS_MAX = 999_999;

export type OnboardingErrorCode =
  | 'nameRequired'
  | 'nameTooLong'
  | 'weddingNameTooLong'
  | 'dateRequired'
  | 'dateInvalid'
  | 'cityTooLong'
  | 'guestsMin'
  | 'guestsMax';
export type OnboardingField = 'name1' | 'name2' | 'date' | 'city' | 'guests';
export type OnboardingErrors = Partial<Record<OnboardingField, OnboardingErrorCode>>;

/** Numărul de invitați din text: null dacă e gol, undefined dacă nu e un întreg >= 1. */
export function parseGuests(raw: string): number | null | undefined {
  const text = raw.trim();
  if (text === '') return null;
  if (!/^\d+$/.test(text)) return undefined;
  const n = Number(text);
  return n >= 1 ? n : undefined;
}

/** Lungimea în caractere ca în Postgres (puncte de cod), nu în unități UTF-16. */
function charLength(text: string): number {
  return [...text].length;
}

/** Numele nunții, la fel ca `coupleLabel` din data/mappers: „A & B", cu numele tăiate. */
export function weddingName(name1: string, name2: string): string {
  return `${name1.trim()} & ${name2.trim()}`;
}

/** Id-urile derivate dintr-un singur id de câmp (etichetă, eroare, indiciu). */
export function fieldIds(id: string): { error: string; hint: string } {
  return { error: `${id}-error`, hint: `${id}-hint` };
}

export function stepIndex(step: StepId): number {
  return STEPS.indexOf(step);
}

export function nextStep(step: StepId): StepId {
  return STEPS[Math.min(stepIndex(step) + 1, STEPS.length - 1)] ?? step;
}

export function prevStep(step: StepId): StepId {
  return STEPS[Math.max(stepIndex(step) - 1, 0)] ?? step;
}

/** Erorile unui pas, pe câmp. Gol = pasul e valid. */
export function validateStep(step: StepId, v: OnboardingValues): OnboardingErrors {
  const errors: OnboardingErrors = {};
  if (step === 'about') {
    const [n1, n2] = [v.name1.trim(), v.name2.trim()];
    if (n1 === '') errors.name1 = 'nameRequired';
    else if (charLength(n1) > PARTNER_NAME_MAX) errors.name1 = 'nameTooLong';
    if (n2 === '') errors.name2 = 'nameRequired';
    else if (charLength(n2) > PARTNER_NAME_MAX) errors.name2 = 'nameTooLong';
    // Combinația se verifică doar când ambele nume sunt valide separat; eroarea stă la al doilea nume.
    if (!errors.name1 && !errors.name2 && charLength(weddingName(n1, n2)) > WEDDING_NAME_MAX) {
      errors.name2 = 'weddingNameTooLong';
    }
  } else if (step === 'wedding') {
    if (v.date === '') errors.date = 'dateRequired';
    else if (!isValidISODate(v.date)) errors.date = 'dateInvalid';
    if (charLength(v.city.trim()) > CITY_MAX) errors.city = 'cityTooLong';
    const guests = parseGuests(v.guests);
    if (guests === undefined) errors.guests = 'guestsMin';
    else if (guests !== null && guests > GUESTS_MAX) errors.guests = 'guestsMax';
  }
  return errors;
}

/** Primul pas cu erori, ca să nu se creeze nimic dintr-un formular nevalid. */
export function firstInvalidStep(v: OnboardingValues): StepId | null {
  return STEPS.find((s) => Object.keys(validateStep(s, v)).length > 0) ?? null;
}

export interface Summary {
  names: string;
  date: string;
  city: string | null;
  guests: number | null;
}

export function summarize(v: OnboardingValues): Summary {
  const city = v.city.trim();
  return {
    names: weddingName(v.name1, v.name2),
    date: v.date,
    city: city === '' ? null : city,
    guests: parseGuests(v.guests) ?? null,
  };
}

export function toStartInput(v: OnboardingValues): StartInput {
  return {
    weddingDate: v.date,
    names: [v.name1.trim(), v.name2.trim()],
    guests: parseGuests(v.guests) ?? null,
    city: v.city.trim(),
  };
}
