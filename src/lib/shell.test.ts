import { describe, expect, it } from 'vitest';
import { parseISODate } from '../domain/dates';
import type { Task } from '../domain/schema';
import { coupleInitials, dayPart, NAV_ITEMS, navIdForPath, recoverBadgeCount } from './shell';

const wedding = parseISODate('2027-01-23');
const today = parseISODate('2026-10-05');

function task(over: Partial<Task>): Task {
  return {
    id: 'x',
    title: 't',
    category: 'altele',
    owner: 'both',
    status: 'todo',
    daysBefore: null,
    manualDate: null,
    details: '',
    note: '',
    ...over,
  };
}

describe('NAV_ITEMS', () => {
  it('are cele cinci rute, în ordine, fără dubluri', () => {
    expect(NAV_ITEMS.map((i) => i.to)).toEqual([
      '/w/$weddingId',
      '/w/$weddingId/start',
      '/w/$weddingId/guests',
      '/w/$weddingId/calculator',
      '/w/$weddingId/settings',
    ]);
    expect(new Set(NAV_ITEMS.map((i) => i.id)).size).toBe(5);
  });
});

describe('navIdForPath', () => {
  it('găsește ecranul, cu sau fără slash final', () => {
    expect(navIdForPath('/w/abc')).toBe('home');
    expect(navIdForPath('/w/abc/')).toBe('home');
    expect(navIdForPath('/w/abc/start')).toBe('tasks');
    expect(navIdForPath('/w/abc/guests')).toBe('guests');
    expect(navIdForPath('/w/abc/calculator/')).toBe('budget');
    expect(navIdForPath('/w/abc/settings')).toBe('settings');
  });

  it('ruta necunoscută cade pe acasă', () => {
    expect(navIdForPath('/nimic')).toBe('home');
  });
});

describe('recoverBadgeCount', () => {
  it('numără doar taskurile nefinalizate din etape trecute', () => {
    const tasks = [
      task({ id: 'a', manualDate: '2026-06-01' }),
      task({ id: 'b', manualDate: '2026-06-01', status: 'done' }),
      task({ id: 'c', manualDate: '2027-01-10' }),
      task({ id: 'd' }),
    ];
    expect(recoverBadgeCount(tasks, wedding, today)).toBe(1);
  });

  it('e 0 fără taskuri', () => {
    expect(recoverBadgeCount([], wedding, today)).toBe(0);
  });
});

describe('dayPart', () => {
  it('împarte ziua în dimineață, după-amiază, seară', () => {
    expect([0, 11, 12, 17, 18, 23].map(dayPart)).toEqual([
      'morning',
      'morning',
      'afternoon',
      'afternoon',
      'evening',
      'evening',
    ]);
  });
});

describe('coupleInitials', () => {
  it('ia inițialele prenumelor', () => {
    expect(coupleInitials(['ana', ' Mihai'])).toBe('A&M');
  });

  it('un singur nume sau niciunul', () => {
    expect(coupleInitials(['Ana', ''])).toBe('A');
    expect(coupleInitials(['', ' '])).toBe('N');
  });
});
