import { describe, expect, it } from 'vitest';
import { coupleLabel } from '../data/mappers';
import { createInitialData } from './initial';
import {
  CITY_MAX,
  fieldIds,
  firstInvalidStep,
  GUESTS_MAX,
  nextStep,
  type OnboardingValues,
  PARTNER_NAME_MAX,
  parseGuests,
  prevStep,
  summarize,
  toStartInput,
  validateStep,
  WEDDING_NAME_MAX,
  weddingName,
} from './onboardingSteps';

const ok: OnboardingValues = { name1: ' Ana ', name2: 'Mihai', date: '2027-01-23', city: ' Brașov ', guests: '180' };
const empty: OnboardingValues = { name1: '', name2: ' ', date: '', city: '', guests: '' };

describe('step navigation', () => {
  it('clamps at both ends', () => {
    expect(nextStep('about')).toBe('wedding');
    expect(nextStep('done')).toBe('done');
    expect(prevStep('wedding')).toBe('about');
    expect(prevStep('about')).toBe('about');
  });
});

describe('validateStep', () => {
  it('requires both names', () => {
    expect(validateStep('about', empty)).toEqual({ name1: 'nameRequired', name2: 'nameRequired' });
    expect(validateStep('about', ok)).toEqual({});
  });
  it('requires a valid date and guests >= 1 when given', () => {
    expect(validateStep('wedding', empty)).toEqual({ date: 'dateRequired' });
    expect(validateStep('wedding', { ...ok, date: '2027-02-31' })).toEqual({ date: 'dateInvalid' });
    expect(validateStep('wedding', { ...ok, guests: '0' })).toEqual({ guests: 'guestsMin' });
    expect(validateStep('wedding', { ...ok, guests: '', city: '' })).toEqual({});
  });
  it('has nothing to validate on the last step', () => {
    expect(validateStep('done', empty)).toEqual({});
  });
});

describe('firstInvalidStep', () => {
  it('finds the first failing step or null', () => {
    expect(firstInvalidStep(ok)).toBeNull();
    expect(firstInvalidStep({ ...ok, date: '' })).toBe('wedding');
    expect(firstInvalidStep(empty)).toBe('about');
  });
});

describe('summary and submit', () => {
  it('summarizes with trimmed values', () => {
    expect(summarize(ok)).toEqual({ names: 'Ana & Mihai', date: '2027-01-23', city: 'Brașov', guests: 180 });
    expect(summarize({ ...ok, city: '  ' }).city).toBeNull();
  });
  it('maps the city into settings.city', () => {
    const data = createInitialData(toStartInput(ok), new Date('2026-10-06T00:00:00Z'));
    expect(data.settings.city).toBe('Brașov');
    expect(data.settings.names).toEqual(['Ana', 'Mihai']);
    expect(data.budget.scenarios).toEqual([180]);
  });
  it('city stays optional in createInitialData', () => {
    const data = createInitialData({ weddingDate: '2027-01-23', names: ['A', 'B'], guests: null }, new Date());
    expect(data.settings.city).toBe('');
  });
});

describe('guests parsing', () => {
  it.each([
    ['0', undefined],
    ['-3', undefined],
    ['1.5', undefined],
    ['12abc', undefined],
    ['', null],
    ['  ', null],
    ['12', 12],
    [' 200 ', 200],
  ])('parseGuests(%j)', (raw, expected) => {
    expect(parseGuests(raw)).toBe(expected);
  });
  it.each(['0', '-3', '1.5', '12abc'])('flags %j on the wedding step and never reaches the data', (raw) => {
    expect(validateStep('wedding', { ...ok, guests: raw })).toEqual({ guests: 'guestsMin' });
    expect(firstInvalidStep({ ...ok, guests: raw })).toBe('wedding');
  });
  it('accepts empty and valid numbers', () => {
    expect(validateStep('wedding', { ...ok, guests: '' })).toEqual({});
    expect(toStartInput({ ...ok, guests: '' }).guests).toBeNull();
    expect(toStartInput({ ...ok, guests: '12' }).guests).toBe(12);
  });
});

describe('fieldIds', () => {
  it('derives error and hint ids from the field id', () => {
    expect(fieldIds('f1')).toEqual({ error: 'f1-error', hint: 'f1-hint' });
  });
});

describe('limits of create_wedding', () => {
  const a = (n: number) => 'a'.repeat(n);

  it('keeps the real limits from the SQL', () => {
    expect([PARTNER_NAME_MAX, WEDDING_NAME_MAX, CITY_MAX, GUESTS_MAX]).toEqual([80, 120, 120, 999_999]);
  });
  it('builds the combined name exactly like the adapter', () => {
    expect(weddingName(' Ana ', ' Mihai ')).toBe(coupleLabel(' Ana ', ' Mihai '));
  });
  it('accepts a partner name at the limit and rejects one over it, per field', () => {
    expect(validateStep('about', { ...ok, name1: a(PARTNER_NAME_MAX), name2: 'B' })).toEqual({});
    expect(validateStep('about', { ...ok, name1: a(PARTNER_NAME_MAX + 1), name2: 'B' })).toEqual({
      name1: 'nameTooLong',
    });
    expect(validateStep('about', { ...ok, name1: 'A', name2: a(PARTNER_NAME_MAX + 1) })).toEqual({
      name2: 'nameTooLong',
    });
  });
  it('measures the trimmed name and counts characters, not UTF-16 units', () => {
    expect(validateStep('about', { ...ok, name1: `  ${a(PARTNER_NAME_MAX)}  `, name2: 'B' })).toEqual({});
    expect(validateStep('about', { ...ok, name1: '😀'.repeat(PARTNER_NAME_MAX), name2: 'B' })).toEqual({});
  });
  it('limits the combined name "A & B" to 120 characters', () => {
    // 3 characters for " & ": 58 + 3 + 59 = 120 passes, 121 fails.
    expect(validateStep('about', { ...ok, name1: a(58), name2: a(59) })).toEqual({});
    expect(validateStep('about', { ...ok, name1: a(59), name2: a(59) })).toEqual({ name2: 'weddingNameTooLong' });
    expect(validateStep('about', { ...ok, name1: a(70), name2: a(70) })).toEqual({ name2: 'weddingNameTooLong' });
    expect(validateStep('about', { ...ok, name1: a(80), name2: a(37) })).toEqual({});
    expect(validateStep('about', { ...ok, name1: a(80), name2: a(38) })).toEqual({ name2: 'weddingNameTooLong' });
  });
  it('reports the per-name error instead of the combined one', () => {
    expect(validateStep('about', { ...ok, name1: a(81), name2: a(81) })).toEqual({
      name1: 'nameTooLong',
      name2: 'nameTooLong',
    });
  });
  it('limits the city to 120 trimmed characters', () => {
    expect(validateStep('wedding', { ...ok, city: a(CITY_MAX) })).toEqual({});
    expect(validateStep('wedding', { ...ok, city: ` ${a(CITY_MAX)} ` })).toEqual({});
    expect(validateStep('wedding', { ...ok, city: a(CITY_MAX + 1) })).toEqual({ city: 'cityTooLong' });
  });
  it('limits guests to 999999', () => {
    expect(validateStep('wedding', { ...ok, guests: String(GUESTS_MAX) })).toEqual({});
    expect(validateStep('wedding', { ...ok, guests: String(GUESTS_MAX + 1) })).toEqual({ guests: 'guestsMax' });
    expect(validateStep('wedding', { ...ok, guests: '1000000' })).toEqual({ guests: 'guestsMax' });
    expect(validateStep('wedding', { ...ok, guests: '' })).toEqual({});
  });
  it('flags an over-limit form on its step', () => {
    expect(firstInvalidStep({ ...ok, name1: a(70), name2: a(70) })).toBe('about');
    expect(firstInvalidStep({ ...ok, guests: '1000000' })).toBe('wedding');
  });
});
