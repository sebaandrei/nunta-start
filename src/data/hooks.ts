/**
 * Hook-uri de citire peste query-urile serverului. Datele sunt deja în cache când ecranul se
 * deschide (loader-ul rutei le încarcă), deci `useSuspenseQuery` nu arată de obicei nimic de așteptare.
 */
import { useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { addDays, startOfDay, toISODate } from '../domain/dates';
import type { AppData, Budget, Settings } from '../domain/schema';
import { useWedding } from '../lib/wedding';
import { budgetFromRows, type ServerTask, scenarioIds, settingsFromWedding } from './mappers';
import { budgetLinesQuery, budgetScenariosQuery, budgetSettingsQuery, tasksQuery } from './queries';

export function useTasks(weddingId: string): ServerTask[] {
  return useSuspenseQuery(tasksQuery(weddingId)).data;
}

/** Bugetul nunții din cache, în forma de domeniu, cu id-urile scenariilor (în aceeași ordine ca `budget.scenarios`). */
export function useBudget(weddingId: string): { budget: Budget; scenarioIds: string[] } {
  const settings = useSuspenseQuery(budgetSettingsQuery(weddingId)).data;
  const scenarios = useSuspenseQuery(budgetScenariosQuery(weddingId)).data;
  const lines = useSuspenseQuery(budgetLinesQuery(weddingId)).data;
  return useMemo(
    () => ({ budget: budgetFromRows({ settings, scenarios, lines }), scenarioIds: scenarioIds(scenarios) }),
    [settings, scenarios, lines],
  );
}

/** Setările nunții din context (data, nume, oraș, nași, curs, monedă). `wedding_date` lipsă cade pe peste un an. */
export function useSettings(): Settings {
  const { wedding } = useWedding();
  return useMemo(() => {
    const fallback = toISODate(addDays(startOfDay(new Date()), 365));
    return settingsFromWedding(wedding, fallback);
  }, [wedding]);
}

/**
 * SEAM pentru Buget (NS-043) și Setări (NS-044): aceeași formă ca `useAppData()` din store, dar
 * citită de pe server (nunta din context, taskuri, buget). Doar citire: scrierile se mută pe
 * mutații în src/data/, iar ecranul își schimbă importul de aici cu hook-urile lui.
 */
export function useWeddingAppData(): AppData {
  const { id, wedding } = useWedding();
  const tasks = useTasks(id);
  const settings = useSuspenseQuery(budgetSettingsQuery(id)).data;
  const scenarios = useSuspenseQuery(budgetScenariosQuery(id)).data;
  const lines = useSuspenseQuery(budgetLinesQuery(id)).data;

  return useMemo(() => {
    // `wedding_date` e nullable în DB (onboarding îl cere mereu): fără el, o dată la un an distanță.
    const fallback = toISODate(addDays(startOfDay(new Date()), 365));
    const now = new Date().toISOString();
    return {
      settings: settingsFromWedding(wedding, fallback),
      tasks,
      budget: budgetFromRows({ settings, scenarios, lines }),
      // Copiile de siguranță sunt ale planului local; cu datele pe server nu există.
      meta: { createdAt: now, lastChangedAt: now, lastExportedAt: now },
    };
  }, [wedding, tasks, settings, scenarios, lines]);
}
