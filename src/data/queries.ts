/** Fabrici de opțiuni de query, peste fabrica de chei. Singurul loc care leagă o cheie de funcția ei de citire. */
import { queryOptions } from '@tanstack/react-query';
import { keys } from '../lib/queryKeys';
import { getBudgetSettings, listBudgetLines, listBudgetScenarios } from './budget';
import { listCollectionFields, listCollectionRecords, listCollections } from './collections';
import { listGuests, listHouseholds } from './guests';
import { listTasks } from './tasks';
import { getWedding, listMyWeddings } from './weddings';

export const weddingsQuery = () => queryOptions({ queryKey: keys.list(), queryFn: listMyWeddings });

export const weddingQuery = (id: string) =>
  queryOptions({ queryKey: keys.wedding(id).detail(), queryFn: () => getWedding(id) });

export const tasksQuery = (weddingId: string) =>
  queryOptions({ queryKey: keys.wedding(weddingId).tasks(), queryFn: () => listTasks(weddingId) });

export const budgetSettingsQuery = (weddingId: string) =>
  queryOptions({ queryKey: keys.wedding(weddingId).budgetSettings(), queryFn: () => getBudgetSettings(weddingId) });

export const budgetScenariosQuery = (weddingId: string) =>
  queryOptions({ queryKey: keys.wedding(weddingId).budgetScenarios(), queryFn: () => listBudgetScenarios(weddingId) });

export const budgetLinesQuery = (weddingId: string) =>
  queryOptions({ queryKey: keys.wedding(weddingId).budgetLines(), queryFn: () => listBudgetLines(weddingId) });

export const householdsQuery = (weddingId: string) =>
  queryOptions({ queryKey: keys.wedding(weddingId).households(), queryFn: () => listHouseholds(weddingId) });

export const guestsQuery = (weddingId: string) =>
  queryOptions({ queryKey: keys.wedding(weddingId).guests(), queryFn: () => listGuests(weddingId) });

export const collectionsQuery = (weddingId: string) =>
  queryOptions({ queryKey: keys.wedding(weddingId).collections(), queryFn: () => listCollections(weddingId) });

export const collectionFieldsQuery = (weddingId: string) =>
  queryOptions({
    queryKey: keys.wedding(weddingId).collectionFields(),
    queryFn: () => listCollectionFields(weddingId),
  });

export const collectionRecordsQuery = (weddingId: string) =>
  queryOptions({
    queryKey: keys.wedding(weddingId).collectionRecords(),
    queryFn: () => listCollectionRecords(weddingId),
  });
