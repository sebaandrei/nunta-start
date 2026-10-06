import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { createBudgetLine } from '../domain/initial';
import type { BudgetLine } from '../domain/schema';
import { keys } from '../lib/queryKeys';
import {
  clearBudgetAmounts,
  deleteBudgetLine,
  deleteScenario,
  insertBudgetLine,
  insertScenario,
  saveBudgetSettings,
  updateBudgetLine,
  updateScenarioGuests,
} from './budget';
import {
  type BudgetLineRow,
  type BudgetRows,
  type BudgetScenarioRow,
  type BudgetSettingsPatch,
  type BudgetSettingsRow,
  budgetSettingsPatchToUpdate,
  changedColumns,
  lineRowFromLine,
  lineToUpdate,
  nextPosition,
  nextScenarioGuests,
  selectionAfterRemoval,
} from './mappers';
import { budgetLinesQuery, budgetScenariosQuery, budgetSettingsQuery } from './queries';

export interface BudgetActions {
  /** Darurile și scenariul ales; doar coloanele care chiar se schimbă pleacă spre server. */
  updateSettings(patch: BudgetSettingsPatch): void;
  selectScenario(id: string): void;
  addScenario(): void;
  updateScenario(id: string, guests: number): void;
  /** Dacă scenariul era cel ales, alegerea trece pe primul rămas. Limitele 1-4 le păzește DB-ul. */
  removeScenario(id: string): void;
  /** Adaugă o linie goală (EUR, fix × 1); întoarce id-ul (UUID de client) ca ecranul să o poată focaliza. */
  addLine(name: string): string;
  updateLine(id: string, patch: Partial<Omit<BudgetLine, 'id'>>): void;
  removeLine(id: string): void;
  clearAmounts(): void;
}

/** Ordinea strictă a scrierilor de buget pe o nuntă. */
const scopeFor = (weddingId: string) => ({ id: `budget:${weddingId}` });

/**
 * Mutație cu update optimist peste cele trei liste din cache (setări, scenarii, linii), ca o ștergere de
 * scenariu să mute și alegerea dintr-o singură mișcare. La eroare, listele revin la ce erau (toast-ul vine
 * din `MutationCache`), dar numai dacă nu mai sunt scrieri în zbor (altfel ar șterge și munca lor): atunci
 * se resincronizează de pe server când ultima se termină. Un strat realtime poate corecta aceleași liste
 * cu `setQueryData` pe `keys.wedding(id).budget*()`.
 */
function useBudgetMutation<V>(
  weddingId: string,
  mutationFn: (variables: V) => Promise<unknown>,
  apply: (rows: BudgetRows, variables: V) => BudgetRows,
) {
  const queryClient = useQueryClient();
  const settingsKey = budgetSettingsQuery(weddingId).queryKey;
  const scenariosKey = budgetScenariosQuery(weddingId).queryKey;
  const linesKey = budgetLinesQuery(weddingId).queryKey;
  const budgetKey = keys.wedding(weddingId).budget();
  const mutationKey = [...budgetKey, 'write'] as const;
  const inFlight = () => queryClient.isMutating({ mutationKey });
  return useMutation({
    mutationKey,
    scope: scopeFor(weddingId),
    mutationFn,
    onMutate: async (variables: V) => {
      await queryClient.cancelQueries({ queryKey: budgetKey });
      const previous: BudgetRows = {
        settings: queryClient.getQueryData<BudgetSettingsRow | null>(settingsKey) ?? null,
        scenarios: queryClient.getQueryData<BudgetScenarioRow[]>(scenariosKey) ?? [],
        lines: queryClient.getQueryData<BudgetLineRow[]>(linesKey) ?? [],
      };
      const next = apply(previous, variables);
      queryClient.setQueryData(settingsKey, next.settings);
      queryClient.setQueryData(scenariosKey, [...next.scenarios]);
      queryClient.setQueryData(linesKey, [...next.lines]);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (!context || inFlight() > 1) return;
      queryClient.setQueryData(settingsKey, context.previous.settings);
      queryClient.setQueryData(scenariosKey, [...context.previous.scenarios]);
      queryClient.setQueryData(linesKey, [...context.previous.lines]);
    },
    onSettled: () => {
      if (inFlight() <= 1) void queryClient.invalidateQueries({ queryKey: budgetKey });
    },
  });
}

/** Bugetul unei nunți: setări, scenarii și linii, toate optimiste. */
export function useBudgetActions(weddingId: string): BudgetActions {
  const queryClient = useQueryClient();
  const withSettings = (rows: BudgetRows, update: Partial<BudgetSettingsRow>): BudgetRows =>
    rows.settings ? { ...rows, settings: { ...rows.settings, ...update } } : rows;

  const settingsM = useBudgetMutation<Partial<BudgetSettingsRow>>(
    weddingId,
    (update) => saveBudgetSettings(weddingId, update),
    withSettings,
  );
  const addScenarioM = useBudgetMutation<BudgetScenarioRow>(
    weddingId,
    (row) => insertScenario(weddingId, row.id, row.guests, row.position),
    (rows, row) => ({ ...rows, scenarios: [...rows.scenarios, row] }),
  );
  const guestsM = useBudgetMutation<{ id: string; guests: number }>(
    weddingId,
    ({ id, guests }) => updateScenarioGuests(id, guests),
    (rows, { id, guests }) => ({
      ...rows,
      scenarios: rows.scenarios.map((s) => (s.id === id ? { ...s, guests } : s)),
    }),
  );
  const removeScenarioM = useBudgetMutation<{ id: string; selectId: string | undefined }>(
    weddingId,
    async ({ id, selectId }) => {
      await deleteScenario(id);
      if (selectId) await saveBudgetSettings(weddingId, { selected_scenario_id: selectId });
    },
    (rows, { id, selectId }) =>
      withSettings(
        { ...rows, scenarios: rows.scenarios.filter((s) => s.id !== id) },
        selectId ? { selected_scenario_id: selectId } : {},
      ),
  );
  const addLineM = useBudgetMutation<{ row: BudgetLineRow; line: BudgetLine }>(
    weddingId,
    ({ row, line }) => insertBudgetLine(weddingId, line, row.position),
    (rows, { row }) => ({ ...rows, lines: [...rows.lines, row] }),
  );
  const lineM = useBudgetMutation<{ id: string; update: Partial<BudgetLineRow> }>(
    weddingId,
    ({ id, update }) => updateBudgetLine(id, update),
    (rows, { id, update }) => ({ ...rows, lines: rows.lines.map((l) => (l.id === id ? { ...l, ...update } : l)) }),
  );
  const removeLineM = useBudgetMutation<string>(
    weddingId,
    (id) => deleteBudgetLine(id),
    (rows, id) => ({ ...rows, lines: rows.lines.filter((l) => l.id !== id) }),
  );
  const clearM = useBudgetMutation<void>(
    weddingId,
    () => clearBudgetAmounts(weddingId),
    (rows) =>
      withSettings(
        { ...rows, lines: rows.lines.map((l) => ({ ...l, unit_price: null, paid: null })) },
        { gift_per_guest: null, family_gift: null },
      ),
  );

  const { mutate: saveSettings } = settingsM;
  const { mutate: addScenarioMutate } = addScenarioM;
  const { mutate: setGuests } = guestsM;
  const { mutate: removeScenarioMutate } = removeScenarioM;
  const { mutate: addLineMutate } = addLineM;
  const { mutate: saveLine } = lineM;
  const { mutate: removeLine } = removeLineM;
  const { mutate: clear } = clearM;

  return useMemo<BudgetActions>(() => {
    const settings = () =>
      queryClient.getQueryData<BudgetSettingsRow | null>(budgetSettingsQuery(weddingId).queryKey) ?? null;
    const scenarios = () =>
      queryClient.getQueryData<BudgetScenarioRow[]>(budgetScenariosQuery(weddingId).queryKey) ?? [];
    const lines = () => queryClient.getQueryData<BudgetLineRow[]>(budgetLinesQuery(weddingId).queryKey) ?? [];
    const updateSettings = (patch: BudgetSettingsPatch) => {
      const current = queryClient.getQueryData<BudgetSettingsRow | null>(budgetSettingsQuery(weddingId).queryKey);
      const update = budgetSettingsPatchToUpdate(patch);
      const changed = current ? changedColumns(current, update) : update;
      if (Object.keys(changed).length > 0) saveSettings(changed);
    };
    return {
      updateSettings,
      selectScenario: (id) => updateSettings({ selectedScenarioId: id }),
      addScenario: () => {
        const now = new Date().toISOString();
        const current = scenarios();
        addScenarioMutate({
          id: crypto.randomUUID(),
          wedding_id: weddingId,
          guests: nextScenarioGuests(current),
          position: nextPosition(current),
          created_at: now,
          updated_at: now,
          updated_by: null,
        });
      },
      updateScenario: (id, guests) => {
        if (scenarios().find((s) => s.id === id)?.guests !== guests) setGuests({ id, guests });
      },
      removeScenario: (id) =>
        removeScenarioMutate({ id, selectId: selectionAfterRemoval(settings(), scenarios(), id) }),
      addLine: (name) => {
        const line = createBudgetLine(name, () => crypto.randomUUID());
        const row = lineRowFromLine(weddingId, line, nextPosition(lines()), new Date().toISOString());
        addLineMutate({ row, line });
        return line.id;
      },
      updateLine: (id, patch) => {
        const current = lines().find((l) => l.id === id);
        if (!current) return;
        const update = changedColumns(current, lineToUpdate(patch));
        if (Object.keys(update).length > 0) saveLine({ id, update });
      },
      removeLine: (id) => removeLine(id),
      clearAmounts: () => clear(),
    };
  }, [
    queryClient,
    weddingId,
    saveSettings,
    addScenarioMutate,
    setGuests,
    removeScenarioMutate,
    addLineMutate,
    saveLine,
    removeLine,
    clear,
  ]);
}
