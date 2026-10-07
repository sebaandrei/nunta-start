import { describe, expect, it } from 'vitest';
import { rsvpHouseholdFromJson } from '../data/rsvpParse';
import { RsvpNotConfiguredError, RsvpNotFoundError, RsvpRejectedError, rsvpErrorKind } from './rsvp';
import { PREVIEW_HOUSEHOLD } from './rsvpPreview';
import {
  formFromHousehold,
  RSVP_NOTE_MAX,
  setAttending,
  setDiet,
  setNote,
  toSubmission,
  unanswered,
} from './rsvpState';

const fresh = () => formFromHousehold(PREVIEW_HOUSEHOLD);

describe('rsvpState', () => {
  it('starts from what the server knows', () => {
    const form = fresh();
    expect(form.answers.g2).toEqual({ attending: 'unknown', diet: 'vegetarian' });
    expect(unanswered(form)).toEqual(['g1', 'g2', 'g3']);
  });

  it('refuses to build a payload while someone is unanswered', () => {
    expect(toSubmission(setAttending(fresh(), 'g1', 'yes'))).toBeNull();
  });

  it('builds the payload once everyone answered, trimming the note', () => {
    let form = fresh();
    form = setAttending(form, 'g1', 'yes');
    form = setAttending(form, 'g2', 'yes');
    form = setDiet(form, 'g2', 'vegan');
    form = setAttending(form, 'g3', 'no');
    form = setNote(form, '  fără gluten  ');
    expect(toSubmission(form)).toEqual({
      answers: [
        { guestId: 'g1', attending: 'yes', diet: 'classic' },
        { guestId: 'g2', attending: 'yes', diet: 'vegan' },
        { guestId: 'g3', attending: 'no', diet: 'classic' },
      ],
      note: 'fără gluten',
    });
  });

  it('adds the Turnstile token only when there is one', () => {
    const form = (['g1', 'g2', 'g3'] as const).reduce((f, id) => setAttending(f, id, 'no'), fresh());
    expect(toSubmission(form)).not.toHaveProperty('turnstileToken');
    expect(toSubmission(form, 'tok')?.turnstileToken).toBe('tok');
  });

  it('has nothing to submit for a household without guests', () => {
    expect(toSubmission({ answers: {}, note: '' })).toBeNull();
  });

  it('ignores unknown guest ids and caps the note', () => {
    const form = fresh();
    expect(setAttending(form, 'nope', 'yes')).toBe(form);
    expect(setDiet(form, 'nope', 'vegan')).toBe(form);
    expect(setNote(form, 'x'.repeat(RSVP_NOTE_MAX + 10)).note).toHaveLength(RSVP_NOTE_MAX);
  });
});

describe('rsvpHouseholdFromJson', () => {
  it('parses a valid response and falls back on unknown values', () => {
    const parsed = rsvpHouseholdFromJson({
      householdName: 'Familia X',
      guests: [
        { id: 'a', name: 'A', ageGroup: 'child', attending: 'yes', diet: 'vegan' },
        { id: 'b', name: 'B', ageGroup: '?', attending: '?', diet: '?' },
        { name: 'no id' },
      ],
    });
    expect(parsed.householdName).toBe('Familia X');
    expect(parsed.weddingName).toBe('');
    expect(parsed.guests).toEqual([
      { id: 'a', name: 'A', ageGroup: 'child', attending: 'yes', diet: 'vegan' },
      { id: 'b', name: 'B', ageGroup: 'adult', attending: 'unknown', diet: 'classic' },
    ]);
  });

  it('survives garbage', () => {
    expect(rsvpHouseholdFromJson(null).guests).toEqual([]);
  });
});

describe('rsvpErrorKind', () => {
  it('maps errors to kinds', () => {
    expect(rsvpErrorKind(new RsvpNotFoundError())).toBe('notFound');
    expect(rsvpErrorKind(new RsvpNotConfiguredError())).toBe('notConfigured');
    expect(rsvpErrorKind(new RsvpRejectedError(429))).toBe('rejected');
    expect(rsvpErrorKind(new TypeError('x'))).toBe('network');
    expect(rsvpErrorKind(new Error('x'))).toBe('generic');
  });
});
