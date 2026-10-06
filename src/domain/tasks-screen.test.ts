import { describe, expect, it } from 'vitest';
import { parseISODate, toISODate } from './dates';
import type { Task } from './schema';
import { filterRecover, nextDue, STAGE_IDS, stageProgress, stageState } from './tasks';

const wedding = parseISODate('2027-09-12');
const today = parseISODate('2026-10-05');

let nextId = 0;
function task(patch: Partial<Task> = {}): Task {
  return {
    id: `s${nextId++}`,
    title: 'task',
    category: 'altele',
    owner: 'both',
    status: 'todo',
    daysBefore: null,
    manualDate: null,
    details: '',
    note: '',
    ...patch,
  };
}

describe('stageProgress', () => {
  it('numără etapa curentă din cele 9', () => {
    expect(stageProgress(wedding, today)).toEqual({ current: 2, total: 9, ratio: 2 / 9 });
  });

  it('după nuntă e ultima etapă', () => {
    expect(stageProgress(wedding, parseISODate('2027-10-01'))).toMatchObject({ current: 9, ratio: 1 });
  });
});

describe('stageState', () => {
  it('marchează trecute, curentă și viitoare', () => {
    const states = STAGE_IDS.map((s) => stageState(s, wedding, today));
    expect(states).toEqual([
      'passed',
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
  });
});

describe('nextDue', () => {
  it('alege cel mai apropiat termen nefinalizat, azi inclus', () => {
    const tasks = [
      task({ title: 'trecut', daysBefore: 400 }),
      task({ title: 'gata', daysBefore: 340, status: 'done' }),
      task({ title: 'târziu', daysBefore: 100 }),
      task({ title: 'azi', manualDate: '2026-10-05' }),
      task({ title: 'curând', manualDate: '2026-10-20' }),
      task({ title: 'fără termen' }),
    ];
    const next = nextDue(tasks, wedding, today);
    expect(next?.task.title).toBe('azi');
    expect(next && toISODate(next.due)).toBe('2026-10-05');
  });

  it('întoarce null când nu urmează niciun termen', () => {
    expect(nextDue([task(), task({ daysBefore: 400 })], wedding, today)).toBeNull();
    expect(nextDue([], wedding, today)).toBeNull();
  });
});

describe('filterRecover', () => {
  it('păstrează doar taskurile de recuperat', () => {
    const tasks = [task({ daysBefore: 400 }), task({ daysBefore: 400, status: 'done' }), task({ daysBefore: 100 })];
    expect(filterRecover(tasks, wedding, today)).toEqual([tasks[0]]);
  });
});
