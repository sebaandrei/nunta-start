/**
 * Live collaboration (NS-054). The server broadcasts every row change of a wedding on its private channel
 * (NS-053); here the changes are applied to the Query cache and the channel is kept alive.
 */
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { keys } from '../lib/queryKeys';
import {
  type BudgetLineRow,
  type BudgetScenarioRow,
  type BudgetSettingsRow,
  type GuestRow,
  guestFromRow,
  type HouseholdRow,
  householdFromRow,
  type ServerGuest,
  type ServerHousehold,
  type ServerTask,
  type TaskRow,
  taskFromRow,
} from './mappers';

export type ChangeOp = 'INSERT' | 'UPDATE' | 'DELETE';

export interface WeddingChange {
  table: string;
  op: ChangeOp;
  /** The new row (INSERT, UPDATE) or the old one (DELETE), as the server serialised it. */
  record: Record<string, unknown>;
}

/** The broadcast payload, or null when it is not a change this client understands. */
export function parseChange(payload: unknown): WeddingChange | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const { table, op, record } = payload as Record<string, unknown>;
  if (typeof table !== 'string') return null;
  if (op !== 'INSERT' && op !== 'UPDATE' && op !== 'DELETE') return null;
  if (typeof record !== 'object' || record === null) return null;
  return { table, op, record: record as Record<string, unknown> };
}

type Writing = (writeKey: QueryKey) => boolean;

/** Applies a change to a list: delete, replace in place, or insert (and re-sort when an order is given). */
function patchList<T extends { id: string }>(
  list: readonly T[],
  op: ChangeOp,
  item: T,
  order?: (a: T, b: T) => number,
): T[] {
  if (op === 'DELETE') return list.filter((x) => x.id !== item.id);
  if (list.some((x) => x.id === item.id)) return list.map((x) => (x.id === item.id ? item : x));
  const next = [...list, item];
  return order ? next.sort(order) : next;
}

const byPositionThenCreated = (
  a: { position: number; created_at: string },
  b: { position: number; created_at: string },
) => a.position - b.position || a.created_at.localeCompare(b.created_at);

/**
 * Patches the cache with one change. Skipped while this client has writes in flight on the same data: those
 * writes already show their result optimistically and refetch when they settle, which picks the change up.
 * While the data is being fetched, the fetch may have started before the change and would overwrite a patch
 * with older rows, so the data is marked stale instead (an observed query restarts its fetch).
 * Data that is not loaded is left alone; it is read fresh when a screen needs it.
 */
export function applyChange(
  queryClient: QueryClient,
  weddingId: string,
  change: WeddingChange,
  isWriting: Writing = (writeKey) => queryClient.isMutating({ mutationKey: writeKey }) > 0,
): void {
  const { table, op, record } = change;
  if (record.wedding_id !== weddingId) return;
  const k = keys.wedding(weddingId);
  const patch = <T>(key: QueryKey, writeKey: QueryKey, update: (current: T) => T) => {
    const current = queryClient.getQueryData<T>(key);
    if (current === undefined || isWriting(writeKey)) return;
    if (queryClient.isFetching({ queryKey: key, exact: true }) > 0) {
      void queryClient.invalidateQueries({ queryKey: key, exact: true });
      return;
    }
    queryClient.setQueryData<T>(key, update(current));
  };

  switch (table) {
    case 'tasks': {
      const task = taskFromRow(record as TaskRow);
      patch<ServerTask[]>(k.tasks(), [...k.tasks(), 'write'], (tasks) =>
        patchList(tasks, op, task, (a, b) => a.position - b.position),
      );
      return;
    }
    case 'households': {
      const household = householdFromRow(record as HouseholdRow);
      patch<ServerHousehold[]>(k.households(), [...k.households(), 'write'], (list) =>
        patchList(list, op, household, (a, b) => a.position - b.position),
      );
      // Cascada din DB șterge și invitații familiei.
      if (op === 'DELETE') void queryClient.invalidateQueries({ queryKey: k.guests(), exact: true });
      return;
    }
    case 'guests': {
      const guest = guestFromRow(record as GuestRow);
      patch<ServerGuest[]>(k.guests(), [...k.guests(), 'write'], (list) =>
        patchList(list, op, guest, (a, b) => a.position - b.position),
      );
      return;
    }
    case 'budget_lines': {
      const row = record as BudgetLineRow;
      patch<BudgetLineRow[]>(k.budgetLines(), [...k.budget(), 'write'], (rows) =>
        patchList(rows, op, row, byPositionThenCreated),
      );
      return;
    }
    case 'budget_scenarios': {
      const row = record as BudgetScenarioRow;
      patch<BudgetScenarioRow[]>(k.budgetScenarios(), [...k.budget(), 'write'], (rows) =>
        patchList(rows, op, row, byPositionThenCreated),
      );
      return;
    }
    case 'budget_settings': {
      const row = record as BudgetSettingsRow;
      patch<BudgetSettingsRow | null>(k.budgetSettings(), [...k.budget(), 'write'], () =>
        op === 'DELETE' ? null : row,
      );
      return;
    }
  }
}

/** Subscription statuses of supabase-js channels. */
type ChannelStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';

/** The slice of the supabase-js client and channel this module needs (a fake in tests). */
export interface RealtimeChannelLike {
  on(
    type: 'broadcast',
    filter: { event: string },
    callback: (message: { payload?: unknown }) => void,
  ): RealtimeChannelLike;
  subscribe(callback: (status: ChannelStatus) => void): unknown;
}

export interface RealtimeClientLike {
  channel(topic: string, options: { config: { private: boolean } }): RealtimeChannelLike;
  removeChannel(channel: RealtimeChannelLike): unknown;
}

/**
 * Listens to the wedding's private channel and keeps the cache in step. Every join, the first one included,
 * reads the wedding's lists again: a change committed after the screen's own fetch but before the join (or
 * while the connection was down) was broadcast to nobody. Returns the unsubscribe.
 */
export function subscribeToWedding(
  client: RealtimeClientLike,
  queryClient: QueryClient,
  weddingId: string,
  isWriting?: Writing,
): () => void {
  const channel = client.channel(`wedding:${weddingId}`, { config: { private: true } });
  channel
    .on('broadcast', { event: '*' }, ({ payload }) => {
      const change = parseChange(payload);
      if (change) applyChange(queryClient, weddingId, change, isWriting);
    })
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      const k = keys.wedding(weddingId);
      void queryClient.invalidateQueries({ queryKey: k.tasks() });
      void queryClient.invalidateQueries({ queryKey: k.budget() });
      void queryClient.invalidateQueries({ queryKey: k.households() });
      void queryClient.invalidateQueries({ queryKey: k.guests() });
    });
  return () => {
    void client.removeChannel(channel);
  };
}
