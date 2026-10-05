import { describe, expect, it } from 'vitest';
import { addMonths, daysBetween, parseISODate, toISODate } from './dates';
import type { Task } from './schema';
import {
  defaultDateForNewTask,
  dueDate,
  filterByOwner,
  groupByStage,
  isRecover,
  nextTasks,
  stageEnd,
  stageOf,
} from './tasks';

const wedding = parseISODate('2027-09-12');
const today = parseISODate('2026-10-05');

let nextId = 0;
function task(patch: Partial<Task> = {}): Task {
  return {
    id: `t${nextId++}`,
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

const iso = (d: Date | null) => (d ? toISODate(d) : null);

describe('date', () => {
  it('numără zilele până la nuntă ca în machetă', () => {
    expect(daysBetween(today, wedding)).toBe(342);
  });

  it('addMonths se oprește la ultima zi a lunii', () => {
    expect(toISODate(addMonths(parseISODate('2027-03-31'), -1))).toBe('2027-02-28');
  });
});

describe('etape', () => {
  it('capetele etapelor', () => {
    expect(iso(stageEnd('m12plus', wedding))).toBe('2026-09-12');
    expect(iso(stageEnd('m9_12', wedding))).toBe('2026-12-12');
    expect(iso(stageEnd('m1_3', wedding))).toBe('2027-08-12');
    expect(iso(stageEnd('lastMonth', wedding))).toBe('2027-09-04');
    expect(iso(stageEnd('lastWeek', wedding))).toBe('2027-09-11');
    expect(iso(stageEnd('day', wedding))).toBe('2027-09-12');
    expect(stageEnd('after', wedding)).toBeNull();
  });

  it('etapa curentă din machetă e 9–12 luni', () => {
    expect(stageOf(today, wedding)).toBe('m9_12');
  });

  it('încadrează termenele la margini', () => {
    const stageForDays = (daysBefore: number) => stageOf(dueDate(task({ daysBefore }), wedding)!, wedding);
    expect(stageForDays(365)).toBe('m12plus');
    expect(stageForDays(364)).toBe('m9_12');
    expect(stageForDays(8)).toBe('lastMonth');
    expect(stageForDays(7)).toBe('lastWeek');
    expect(stageForDays(1)).toBe('lastWeek');
    expect(stageForDays(0)).toBe('day');
    expect(stageForDays(-5)).toBe('after');
  });
});

describe('termen', () => {
  it('termenul manual are prioritate față de cel automat', () => {
    expect(iso(dueDate(task({ daysBefore: 7 }), wedding))).toBe('2027-09-05');
    expect(iso(dueDate(task({ daysBefore: 7, manualDate: '2027-01-01' }), wedding))).toBe('2027-01-01');
    expect(dueDate(task(), wedding)).toBeNull();
  });

  it('schimbarea datei nunții mută doar termenele automate', () => {
    const auto = task({ daysBefore: 30 });
    const manual = task({ daysBefore: 30, manualDate: '2027-05-01' });
    const moved = parseISODate('2027-10-12');
    expect(iso(dueDate(auto, moved))).toBe('2027-09-12');
    expect(iso(dueDate(manual, moved))).toBe('2027-05-01');
  });
});

describe('De recuperat', () => {
  it('nefinalizat dintr-o etapă trecută', () => {
    expect(isRecover(task({ daysBefore: 400 }), wedding, today)).toBe(true);
    expect(isRecover(task({ daysBefore: 400, status: 'done' }), wedding, today)).toBe(false);
    expect(isRecover(task({ daysBefore: 300 }), wedding, today)).toBe(false);
    expect(isRecover(task(), wedding, today)).toBe(false);
  });
});

describe('groupByStage', () => {
  const tasks = [
    task({ daysBefore: 400 }),
    task({ daysBefore: 380, status: 'done' }),
    task({ daysBefore: 300 }),
    task({ daysBefore: 290, status: 'done' }),
    task({ daysBefore: 7 }),
    task({ daysBefore: -10 }),
    task(),
  ];
  const view = groupByStage(tasks, wedding, today);

  it('pune fiecare task exact o dată', () => {
    const ids = [
      ...view.recover,
      ...view.finished,
      ...view.noDate,
      ...view.stages.flatMap((s) => s.tasks),
    ].map((x) => x.id);
    expect(ids.sort()).toEqual(tasks.map((x) => x.id).sort());
  });

  it('începe cu etapa curentă și separă trecutul', () => {
    expect(view.stages[0]).toMatchObject({ stage: 'm9_12', isCurrent: true });
    expect(view.stages.at(-1)?.stage).toBe('after');
    expect(view.recover.map((x) => x.daysBefore)).toEqual([400]);
    expect(view.finished.map((x) => x.daysBefore)).toEqual([380]);
    expect(view.noDate).toHaveLength(1);
  });

  it('în etapă, nefinalizatele vin înaintea celor gata', () => {
    expect(view.stages[0].tasks.map((x) => x.status)).toEqual(['todo', 'done']);
  });
});

describe('nextTasks', () => {
  it('întâi ce e de recuperat, apoi după termen, fără cele gata', () => {
    const tasks = [
      task({ title: 'curând', daysBefore: 300 }),
      task({ title: 'gata', daysBefore: 320, status: 'done' }),
      task({ title: 'recuperat', daysBefore: 380 }),
      task({ title: 'târziu', daysBefore: 10 }),
      task({ title: 'fără termen' }),
    ];
    expect(nextTasks(tasks, wedding, today, 3).map((x) => x.title)).toEqual(['recuperat', 'curând', 'târziu']);
  });
});

describe('filterByOwner', () => {
  const tasks = [task({ owner: 'p1' }), task({ owner: 'p2' }), task({ owner: 'both' })];
  it('o persoană vede și taskurile comune', () => {
    expect(filterByOwner(tasks, 'p1').map((x) => x.owner)).toEqual(['p1', 'both']);
    expect(filterByOwner(tasks, 'both').map((x) => x.owner)).toEqual(['both']);
    expect(filterByOwner(tasks, 'all')).toHaveLength(3);
  });
});

describe('task nou', () => {
  it('primește sfârșitul etapei curente', () => {
    expect(toISODate(defaultDateForNewTask(wedding, today))).toBe('2026-12-12');
  });

  it('după nuntă primește ziua de azi', () => {
    const later = parseISODate('2027-10-01');
    expect(toISODate(defaultDateForNewTask(wedding, later))).toBe('2027-10-01');
  });
});
