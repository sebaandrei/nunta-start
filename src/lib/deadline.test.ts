import { describe, expect, it } from 'vitest';
import { parseISODate } from '../domain/dates';
import { formatDeadline } from './format';

const today = parseISODate('2026-10-06');

describe('formatDeadline', () => {
  it('în vederea pe etape, anul curent are doar ziua și luna', () => {
    expect(formatDeadline(parseISODate('2026-10-12'), { today, showYear: false, locale: 'ro' })).toBe('12 oct');
    expect(formatDeadline(parseISODate('2026-10-12'), { today, showYear: false, locale: 'en' })).toBe('12 Oct');
  });

  it('alt an decât cel curent arată anul', () => {
    expect(formatDeadline(parseISODate('2027-03-05'), { today, showYear: false, locale: 'ro' })).toBe('5 mar 2027');
    expect(formatDeadline(parseISODate('2025-12-01'), { today, showYear: false, locale: 'en' })).toBe('1 Dec 2025');
  });

  it('în vederea pe categorii arată mereu anul', () => {
    expect(formatDeadline(parseISODate('2026-10-12'), { today, showYear: true, locale: 'ro' })).toBe('12 oct 2026');
    expect(formatDeadline(parseISODate('2026-10-12'), { today, showYear: true, locale: 'en' })).toBe('12 Oct 2026');
  });
});
