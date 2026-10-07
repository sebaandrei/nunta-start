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
 * Listens to the wedding's private channel and keeps the cache in step. After the connection was lost and
 * came back, changes may have been missed, so the wedding's lists are read again. Returns the unsubscribe.
 */
export function subscribeToWedding(
  client: RealtimeClientLike,
  queryClient: QueryClient,
  weddingId: string,
  isWriting?: Writing,
): () => void {
  const channel = client.channel(`wedding:${weddingId}`, { config: { private: true } });
  let wasDown = false;
  channel
    .on('broadcast', { event: '*' }, ({ payload }) => {
      const change = parseChange(payload);
      if (change) applyChange(queryClient, weddingId, change, isWriting);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (wasDown) {
          const k = keys.wedding(weddingId);
          void queryClient.invalidateQueries({ queryKey: k.tasks() });
          void queryClient.invalidateQueries({ queryKey: k.budget() });
        }
        wasDown = false;
      } else {
        wasDown = true;
      }
    });
  return () => {
    void client.removeChannel(channel);
  };
}
