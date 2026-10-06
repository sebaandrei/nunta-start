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

export type OnboardingErrorCode = 'nameRequired' | 'dateRequired' | 'dateInvalid' | 'guestsMin';
export type OnboardingField = 'name1' | 'name2' | 'date' | 'guests';
export type OnboardingErrors = Partial<Record<OnboardingField, OnboardingErrorCode>>;

/** Numărul de invitați din text: null dacă e gol, undefined dacă nu e un întreg >= 1. */
export function parseGuests(raw: string): number | null | undefined {
  const text = raw.trim();
  if (text === '') return null;
  if (!/^\d+$/.test(text)) return undefined;
  const n = Number(text);
  return n >= 1 ? n : undefined;
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
    if (v.name1.trim() === '') errors.name1 = 'nameRequired';
    if (v.name2.trim() === '') errors.name2 = 'nameRequired';
  } else if (step === 'wedding') {
    if (v.date === '') errors.date = 'dateRequired';
    else if (!isValidISODate(v.date)) errors.date = 'dateInvalid';
    if (parseGuests(v.guests) === undefined) errors.guests = 'guestsMin';
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
    names: `${v.name1.trim()} & ${v.name2.trim()}`,
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
