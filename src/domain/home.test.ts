import { describe, expect, it } from 'vitest';
import { getMessages } from '../i18n';
import { capitalize, countdown, paidPercent, withCity } from './home';
import { STAGE_IDS } from './tasks';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe('countdown', () => {
  it('numără zilele rămase', () => {
    expect(countdown(d(2027, 1, 23), d(2026, 10, 5))).toEqual({ kind: 'future', days: 110 });
  });
  it('distinge mâine, azi și după nuntă', () => {
    expect(countdown(d(2026, 10, 6), d(2026, 10, 5)).kind).toBe('tomorrow');
    expect(countdown(d(2026, 10, 5), d(2026, 10, 5)).kind).toBe('today');
    expect(countdown(d(2026, 10, 1), d(2026, 10, 5))).toEqual({ kind: 'past', days: 4 });
  });
});

describe('paidPercent', () => {
  it('rotunjește și limitează', () => {
    expect(paidPercent(18200, 62400)).toBe(29);
    expect(paidPercent(5, 0)).toBe(0);
    expect(paidPercent(200, 100)).toBe(100);
    expect(paidPercent(-5, 100)).toBe(0);
  });
});

describe('capitalize', () => {
  it('pune prima literă mare, inclusiv cu diacritice', () => {
    expect(capitalize('sâmbătă, 23 ianuarie')).toBe('Sâmbătă, 23 ianuarie');
    expect(capitalize('')).toBe('');
  });
});

describe('withCity', () => {
  it('adaugă orașul după dată', () => {
    expect(withCity('Sâmbătă, 23 ianuarie 2027', ' Brașov ')).toBe('Sâmbătă, 23 ianuarie 2027 · Brașov');
  });

  it('nu adaugă nimic când orașul e gol', () => {
    expect(withCity('Sâmbătă, 23 ianuarie 2027', '')).toBe('Sâmbătă, 23 ianuarie 2027');
    expect(withCity('Sâmbătă, 23 ianuarie 2027', '   ')).toBe('Sâmbătă, 23 ianuarie 2027');
  });
});

describe('descrierile etapelor', () => {
  it.each(['ro', 'en'] as const)('există pentru fiecare etapă (%s)', (locale) => {
    const t = getMessages(locale);
    for (const stage of STAGE_IDS) expect(t.home.stageDescriptions[stage].length).toBeGreaterThan(10);
  });
});
