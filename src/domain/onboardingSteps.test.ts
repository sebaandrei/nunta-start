import { describe, expect, it } from 'vitest';
import { createInitialData } from './initial';
import {
  firstInvalidStep,
  nextStep,
  type OnboardingValues,
  prevStep,
  summarize,
  toStartInput,
  validateStep,
} from './onboardingSteps';

const ok: OnboardingValues = { name1: ' Ana ', name2: 'Mihai', date: '2027-01-23', city: ' Brașov ', guests: 180 };
const empty: OnboardingValues = { name1: '', name2: ' ', date: '', city: '', guests: null };

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
    expect(validateStep('wedding', { ...ok, guests: 0 })).toEqual({ guests: 'guestsMin' });
    expect(validateStep('wedding', { ...ok, guests: null, city: '' })).toEqual({});
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
