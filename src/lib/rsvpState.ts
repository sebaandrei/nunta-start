import type { Attending, Diet } from '../domain/guests';
import type { RsvpHousehold, RsvpSubmission } from './rsvp';

/** Cât poate scrie familia în notă. */
export const RSVP_NOTE_MAX = 500;

export interface RsvpForm {
  answers: Record<string, { attending: Attending; diet: Diet }>;
  note: string;
}

/** Formularul pornește din ce știe deja serverul. */
export function formFromHousehold(household: RsvpHousehold): RsvpForm {
  return {
    answers: Object.fromEntries(household.guests.map((g) => [g.id, { attending: g.attending, diet: g.diet }])),
    note: household.note,
  };
}

export function setAttending(form: RsvpForm, guestId: string, attending: Attending): RsvpForm {
  const current = form.answers[guestId];
  if (!current) return form;
  return { ...form, answers: { ...form.answers, [guestId]: { ...current, attending } } };
}

export function setDiet(form: RsvpForm, guestId: string, diet: Diet): RsvpForm {
  const current = form.answers[guestId];
  if (!current) return form;
  return { ...form, answers: { ...form.answers, [guestId]: { ...current, diet } } };
}

export function setNote(form: RsvpForm, note: string): RsvpForm {
  return { ...form, note: note.slice(0, RSVP_NOTE_MAX) };
}

/** Invitații la care familia n-a răspuns încă (nici „vine", nici „nu vine"). */
export function unanswered(form: RsvpForm): string[] {
  return Object.entries(form.answers)
    .filter(([, a]) => a.attending === 'unknown')
    .map(([id]) => id);
}

/** Formularul în corpul cererii; `null` cât mai lipsește un răspuns sau nu există invitați. */
export function toSubmission(form: RsvpForm, turnstileToken = ''): RsvpSubmission | null {
  const entries = Object.entries(form.answers);
  if (entries.length === 0 || unanswered(form).length > 0) return null;
  const answers = entries.map(([guestId, a]) => ({
    guestId,
    attending: a.attending === 'yes' ? ('yes' as const) : ('no' as const),
    diet: a.diet,
  }));
  const submission: RsvpSubmission = { answers, note: form.note.trim() };
  if (turnstileToken) submission.turnstileToken = turnstileToken;
  return submission;
}
