import { create } from 'zustand';
import { clearAmounts } from './domain/budget';
import { parseISODate, startOfDay, toISODate } from './domain/dates';
import { createBudgetLine, createInitialData, createTask, type StartInput } from './domain/initial';
import type { AppData, Budget, BudgetLine, Settings, Task } from './domain/schema';
import { defaultDateForNewTask, nextStatus } from './domain/tasks';
import { getBrowserStorage, loadData, saveData } from './storage/storage';
import { t } from './text';

export type StorageStatus = 'ok' | 'unavailable';

interface StoreState {
  data: AppData | null;
  storageStatus: StorageStatus;
  /** Datele găsite în browser care nu au putut fi citite. */
  corruptRaw: string | null;

  start(input: StartInput): void;
  replaceData(data: AppData): void;
  reset(): void;
  markExported(): void;

  updateSettings(patch: Partial<Settings>): void;

  addTask(): string;
  updateTask(id: string, patch: Partial<Task>): void;
  removeTask(id: string): void;
  cycleTaskStatus(id: string): void;

  updateBudget(patch: Partial<Omit<Budget, 'lines' | 'scenarios' | 'selected'>>): void;
  setScenario(index: number, guests: number): void;
  addScenario(): void;
  removeScenario(index: number): void;
  selectScenario(index: number): void;
  addLine(): string;
  updateLine(id: string, patch: Partial<BudgetLine>): void;
  removeLine(id: string): void;
  clearAmounts(): void;
}

const storage = getBrowserStorage();
const initial = loadData(storage);

export const useStore = create<StoreState>()((set, get) => {
  /** Aplică o modificare și notează momentul ei. */
  const change = (fn: (data: AppData) => AppData) =>
    set((state) => (state.data ? { data: touch(fn(state.data)) } : state));

  const changeBudget = (fn: (budget: Budget) => Budget) => change((d) => ({ ...d, budget: fn(d.budget) }));

  return {
    data: initial.status === 'ok' ? initial.data : null,
    storageStatus: initial.status === 'unavailable' ? 'unavailable' : 'ok',
    corruptRaw: initial.status === 'corrupt' ? initial.raw : null,

    start: (input) => set({ data: createInitialData(input, new Date()), corruptRaw: null }),

    replaceData: (data) => {
      const now = new Date().toISOString();
      set({ data: { ...data, meta: { ...data.meta, lastChangedAt: now, lastExportedAt: now } }, corruptRaw: null });
    },

    reset: () => set({ data: null, corruptRaw: null }),

    markExported: () =>
      set((state) =>
        state.data
          ? { data: { ...state.data, meta: { ...state.data.meta, lastExportedAt: new Date().toISOString() } } }
          : state,
      ),

    updateSettings: (patch) => change((d) => ({ ...d, settings: { ...d.settings, ...patch } })),

    addTask: () => {
      const data = get().data;
      if (!data) return '';
      const due = defaultDateForNewTask(parseISODate(data.settings.weddingDate), startOfDay(new Date()));
      const task = createTask(toISODate(due));
      change((d) => ({ ...d, tasks: [...d.tasks, task] }));
      return task.id;
    },

    updateTask: (id, patch) =>
      change((d) => ({ ...d, tasks: d.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)) })),

    removeTask: (id) => change((d) => ({ ...d, tasks: d.tasks.filter((task) => task.id !== id) })),

    cycleTaskStatus: (id) =>
      change((d) => ({
        ...d,
        tasks: d.tasks.map((task) => (task.id === id ? { ...task, status: nextStatus(task.status) } : task)),
      })),

    updateBudget: (patch) => changeBudget((b) => ({ ...b, ...patch })),

    setScenario: (index, guests) =>
      changeBudget((b) => ({ ...b, scenarios: b.scenarios.map((g, i) => (i === index ? guests : g)) })),

    addScenario: () =>
      changeBudget((b) => {
        if (b.scenarios.length >= 4) return b;
        const last = b.scenarios[b.scenarios.length - 1];
        return { ...b, scenarios: [...b.scenarios, Math.max(1, Math.round((last * 1.2) / 10) * 10)] };
      }),

    removeScenario: (index) =>
      changeBudget((b) => {
        if (b.scenarios.length <= 1) return b;
        const scenarios = b.scenarios.filter((_, i) => i !== index);
        const selected = b.selected === index ? 0 : b.selected > index ? b.selected - 1 : b.selected;
        return { ...b, scenarios, selected: Math.min(selected, scenarios.length - 1) };
      }),

    selectScenario: (index) => changeBudget((b) => ({ ...b, selected: index })),

    addLine: () => {
      const line = createBudgetLine(t.calc.newLine);
      changeBudget((b) => ({ ...b, lines: [...b.lines, line] }));
      return line.id;
    },

    updateLine: (id, patch) =>
      changeBudget((b) => ({ ...b, lines: b.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),

    removeLine: (id) => changeBudget((b) => ({ ...b, lines: b.lines.filter((l) => l.id !== id) })),

    clearAmounts: () => changeBudget(clearAmounts),
  };
});

function touch(data: AppData): AppData {
  return { ...data, meta: { ...data.meta, lastChangedAt: new Date().toISOString() } };
}

// Salvare automată la fiecare schimbare a datelor.
useStore.subscribe((state, previous) => {
  if (state.data === previous.data) return;
  const saved = saveData(storage, state.data);
  if (!saved && state.storageStatus !== 'unavailable') useStore.setState({ storageStatus: 'unavailable' });
});

let lastData: AppData | null = initial.status === 'ok' ? initial.data : null;

/** Datele curente, pentru ecranele care apar doar după pornire. */
export function useAppData(): AppData {
  const data = useStore((s) => s.data);
  if (data) lastData = data;
  return (data ?? lastData) as AppData;
}
