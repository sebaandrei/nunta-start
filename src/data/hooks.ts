/**
 * Hook-uri de citire peste query-urile serverului. Datele sunt deja în cache când ecranul se
 * deschide (loader-ul rutei le încarcă), deci `useSuspenseQuery` nu arată de obicei nimic de așteptare.
 */
import { useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { addDays, startOfDay, toISODate } from '../domain/dates';
import type { Budget, Settings } from '../domain/schema';
import { useWedding } from '../lib/wedding';
import {
  budgetFromRows,
  type ServerCollection,
  type ServerCollectionField,
  type ServerCollectionRecord,
  type ServerGuest,
  type ServerHousehold,
  type ServerTask,
  scenarioIds,
  settingsFromWedding,
} from './mappers';
import {
  budgetLinesQuery,
  budgetScenariosQuery,
  budgetSettingsQuery,
  collectionFieldsQuery,
  collectionRecordsQuery,
  collectionsQuery,
  guestsQuery,
  householdsQuery,
  tasksQuery,
} from './queries';

export function useTasks(weddingId: string): ServerTask[] {
  return useSuspenseQuery(tasksQuery(weddingId)).data;
}

export function useHouseholds(weddingId: string): ServerHousehold[] {
  return useSuspenseQuery(householdsQuery(weddingId)).data;
}

export function useGuests(weddingId: string): ServerGuest[] {
  return useSuspenseQuery(guestsQuery(weddingId)).data;
}

export function useCollections(weddingId: string): ServerCollection[] {
  return useSuspenseQuery(collectionsQuery(weddingId)).data;
}

export function useCollectionFields(weddingId: string): ServerCollectionField[] {
  return useSuspenseQuery(collectionFieldsQuery(weddingId)).data;
}

export function useCollectionRecords(weddingId: string): ServerCollectionRecord[] {
  return useSuspenseQuery(collectionRecordsQuery(weddingId)).data;
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
