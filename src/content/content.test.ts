import { describe, expect, it } from 'vitest';
import { addDays, parseISODate } from '../domain/dates';
import { STAGE_IDS, stageOf } from '../domain/tasks';
import { BUDGET_DEFAULTS, TASK_TEMPLATE } from './index';

describe('șablonul de taskuri', () => {
  it('are id-uri și titluri unice', () => {
    const ids = TASK_TEMPLATE.map((t) => t.id);
    const titles = TASK_TEMPLATE.map((t) => t.title);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('acoperă fiecare etapă', () => {
    const wedding = parseISODate('2027-09-12');
    const stages = new Set(TASK_TEMPLATE.map((t) => stageOf(addDays(wedding, -t.daysBefore), wedding)));
    expect([...stages].sort()).toEqual([...STAGE_IDS].sort());
  });

  it('are termene rezonabile', () => {
    for (const t of TASK_TEMPLATE) {
      expect(t.daysBefore).toBeLessThanOrEqual(540);
      expect(t.daysBefore).toBeGreaterThanOrEqual(-120);
    }
  });
});

describe('liniile de buget', () => {
  it('au nume unice', () => {
    const names = BUDGET_DEFAULTS.map((l) => l.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
