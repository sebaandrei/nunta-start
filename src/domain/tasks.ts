import { addDays, addMonths, daysBetween, parseISODate } from './dates';
import { CATEGORY_IDS, type Category, type Owner, type Status, type Task } from './schema';

export const STAGE_IDS = ['m12plus', 'm9_12', 'm6_9', 'm3_6', 'm1_3', 'lastMonth', 'lastWeek', 'day', 'after'] as const;
export type StageId = (typeof STAGE_IDS)[number];

/** Ultima zi a fiecărei etape; „După nuntă" nu are capăt. */
const STAGE_ENDS: Record<StageId, ((wedding: Date) => Date) | null> = {
  m12plus: (w) => addMonths(w, -12),
  m9_12: (w) => addMonths(w, -9),
  m6_9: (w) => addMonths(w, -6),
  m3_6: (w) => addMonths(w, -3),
  m1_3: (w) => addMonths(w, -1),
  lastMonth: (w) => addDays(w, -8),
  lastWeek: (w) => addDays(w, -1),
  day: (w) => w,
  after: null,
};

export function stageEnd(stage: StageId, wedding: Date): Date | null {
  const end = STAGE_ENDS[stage];
  return end ? end(wedding) : null;
}

export function stageOf(date: Date, wedding: Date): StageId {
  for (const stage of STAGE_IDS) {
    const end = stageEnd(stage, wedding);
    if (end === null || daysBetween(date, end) >= 0) return stage;
  }
  return 'after';
}

function stageIndex(stage: StageId): number {
  return STAGE_IDS.indexOf(stage);
}

export function autoDueDate(task: Task, wedding: Date): Date | null {
  return task.daysBefore === null ? null : addDays(wedding, -task.daysBefore);
}

/** Termenul efectiv: cel pus de mână, altfel cel din șablon, altfel niciunul. */
export function dueDate(task: Task, wedding: Date): Date | null {
  if (task.manualDate) return parseISODate(task.manualDate);
  return autoDueDate(task, wedding);
}

/** Nefinalizat și dintr-o etapă care a trecut deja. */
export function isRecover(task: Task, wedding: Date, today: Date): boolean {
  if (task.status === 'done') return false;
  const due = dueDate(task, wedding);
  if (!due) return false;
  return stageIndex(stageOf(due, wedding)) < stageIndex(stageOf(today, wedding));
}

export function isOverdue(task: Task, wedding: Date, today: Date): boolean {
  if (task.status === 'done') return false;
  const due = dueDate(task, wedding);
  return due !== null && daysBetween(due, today) > 0;
}

/** Nefinalizatele primele, apoi după termen; cele fără termen la final. */
export function sortTasks(tasks: Task[], wedding: Date): Task[] {
  const doneRank = (t: Task) => (t.status === 'done' ? 1 : 0);
  return [...tasks].sort((a, b) => doneRank(a) - doneRank(b) || compareDue(a, b, wedding));
}

function compareDue(a: Task, b: Task, wedding: Date): number {
  const da = dueDate(a, wedding);
  const db = dueDate(b, wedding);
  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return da.getTime() - db.getTime();
}

export interface StageGroup {
  stage: StageId;
  end: Date | null;
  isCurrent: boolean;
  tasks: Task[];
}

export interface StageView {
  recover: Task[];
  stages: StageGroup[];
  finished: Task[];
  noDate: Task[];
}

/** Împarte toate taskurile, fiecare exact o dată, în grupurile din vederea „Pe etape". */
export function groupByStage(tasks: Task[], wedding: Date, today: Date): StageView {
  const current = stageIndex(stageOf(today, wedding));
  const recover: Task[] = [];
  const finished: Task[] = [];
  const noDate: Task[] = [];
  const byStage = new Map<StageId, Task[]>();

  for (const task of tasks) {
    const due = dueDate(task, wedding);
    if (!due) {
      noDate.push(task);
      continue;
    }
    const stage = stageOf(due, wedding);
    if (stageIndex(stage) < current) {
      (task.status === 'done' ? finished : recover).push(task);
    } else {
      byStage.set(stage, [...(byStage.get(stage) ?? []), task]);
    }
  }

  return {
    recover: sortTasks(recover, wedding),
    stages: STAGE_IDS.slice(current).map((stage, i) => ({
      stage,
      end: stageEnd(stage, wedding),
      isCurrent: i === 0,
      tasks: sortTasks(byStage.get(stage) ?? [], wedding),
    })),
    finished: sortTasks(finished, wedding),
    noDate: sortTasks(noDate, wedding),
  };
}

export interface CategoryGroup {
  category: Category;
  tasks: Task[];
}

export function groupByCategory(tasks: Task[], wedding: Date): CategoryGroup[] {
  return CATEGORY_IDS.map((category) => ({
    category,
    tasks: sortTasks(
      tasks.filter((t) => t.category === category),
      wedding,
    ),
  })).filter((g) => g.tasks.length > 0);
}

/** Pentru Acasă: întâi ce e de recuperat, apoi după termen. */
export function nextTasks(tasks: Task[], wedding: Date, today: Date, limit = 5): Task[] {
  const open = tasks.filter((t) => t.status !== 'done');
  const recover = open.filter((t) => isRecover(t, wedding, today));
  const rest = open.filter((t) => !isRecover(t, wedding, today));
  return [...sortTasks(recover, wedding), ...sortTasks(rest, wedding)].slice(0, limit);
}

export function openInCurrentStage(tasks: Task[], wedding: Date, today: Date): number {
  const current = stageOf(today, wedding);
  return tasks.filter((t) => {
    if (t.status === 'done') return false;
    const due = dueDate(t, wedding);
    return due !== null && stageOf(due, wedding) === current;
  }).length;
}

export type OwnerFilter = 'all' | Owner;

/** Filtrul pe o persoană include și taskurile comune. */
export function filterByOwner(tasks: Task[], filter: OwnerFilter): Task[] {
  if (filter === 'all') return tasks;
  if (filter === 'both') return tasks.filter((t) => t.owner === 'both');
  return tasks.filter((t) => t.owner === filter || t.owner === 'both');
}

export function progress(tasks: Task[]): { done: number; total: number } {
  return { done: tasks.filter((t) => t.status === 'done').length, total: tasks.length };
}

export function nextStatus(status: Status): Status {
  if (status === 'todo') return 'doing';
  if (status === 'doing') return 'done';
  return 'todo';
}

/** Un task nou primește ca termen sfârșitul etapei curente (sau azi, după nuntă). */
export function defaultDateForNewTask(wedding: Date, today: Date): Date {
  const end = stageEnd(stageOf(today, wedding), wedding);
  return end ?? today;
}

export interface StageProgress {
  /** Poziția etapei curente, începând de la 1. */
  current: number;
  total: number;
  /** Cât din drum s-a parcurs, între 0 și 1 (etapa curentă contează ca parcursă). */
  ratio: number;
}

export function stageProgress(wedding: Date, today: Date): StageProgress {
  const total = STAGE_IDS.length;
  const current = stageIndex(stageOf(today, wedding)) + 1;
  return { current, total, ratio: current / total };
}

export type StageState = 'passed' | 'current' | 'upcoming';

export function stageState(stage: StageId, wedding: Date, today: Date): StageState {
  const diff = stageIndex(stage) - stageIndex(stageOf(today, wedding));
  return diff < 0 ? 'passed' : diff === 0 ? 'current' : 'upcoming';
}

/** Cel mai apropiat termen care nu a trecut încă, dintre taskurile nefinalizate. */
export function nextDue(tasks: Task[], wedding: Date, today: Date): { task: Task; due: Date } | null {
  let best: { task: Task; due: Date } | null = null;
  for (const task of tasks) {
    if (task.status === 'done') continue;
    const due = dueDate(task, wedding);
    if (!due || daysBetween(due, today) > 0) continue;
    if (!best || due.getTime() < best.due.getTime()) best = { task, due };
  }
  return best;
}

export function filterRecover(tasks: Task[], wedding: Date, today: Date): Task[] {
  return tasks.filter((t) => isRecover(t, wedding, today));
}
