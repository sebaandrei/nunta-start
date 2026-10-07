import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { keys } from '../lib/queryKeys';
import type { BudgetLineRow, BudgetSettingsRow, ServerGuest, ServerHousehold, ServerTask } from './mappers';
import {
  applyChange,
  parseChange,
  type RealtimeChannelLike,
  type RealtimeClientLike,
  subscribeToWedding,
  type WeddingChange,
} from './realtime';

const W = '00000000-0000-0000-0000-0000000000b1';
const k = keys.wedding(W);

const taskRecord = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  wedding_id: W,
  template_key: null,
  title: `Task ${id}`,
  category: 'altele',
  assignee: 'both',
  status: 'todo',
  days_before: null,
  manual_date: null,
  details: '',
  note: '',
  position: 10,
  created_at: '2026-10-07T10:00:00+00:00',
  updated_at: '2026-10-07T10:00:00+00:00',
  updated_by: null,
  ...over,
});

const change = (table: string, op: WeddingChange['op'], record: Record<string, unknown>): WeddingChange => ({
  table,
  op,
  record,
});

function clientWith(tasks: ServerTask[] = []) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(k.tasks(), tasks);
  return queryClient;
}

const idle = () => false;

describe('parseChange', () => {
  it('reads a broadcast payload', () => {
    expect(parseChange({ table: 'tasks', op: 'UPDATE', record: { id: '1' } })).toEqual({
      table: 'tasks',
      op: 'UPDATE',
      record: { id: '1' },
    });
  });

  it('ignores anything else', () => {
    for (const bad of [
      null,
      'x',
      {},
      { table: 'tasks', op: 'TRUNCATE', record: {} },
      { table: 'tasks', op: 'INSERT' },
    ]) {
      expect(parseChange(bad)).toBeNull();
    }
  });
});

describe('applyChange on tasks', () => {
  it('adds a task another member created, in position order', () => {
    const queryClient = clientWith();
    applyChange(queryClient, W, change('tasks', 'INSERT', taskRecord('b', { position: 20 })), idle);
    applyChange(queryClient, W, change('tasks', 'INSERT', taskRecord('a', { position: 10 })), idle);
    expect(queryClient.getQueryData<ServerTask[]>(k.tasks())?.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('replaces a task on update and does not duplicate it', () => {
    const queryClient = clientWith();
    applyChange(queryClient, W, change('tasks', 'INSERT', taskRecord('a')), idle);
    applyChange(queryClient, W, change('tasks', 'UPDATE', taskRecord('a', { status: 'done' })), idle);
    const tasks = queryClient.getQueryData<ServerTask[]>(k.tasks());
    expect(tasks).toHaveLength(1);
    expect(tasks?.[0].status).toBe('done');
  });

  it('removes a deleted task', () => {
    const queryClient = clientWith();
    applyChange(queryClient, W, change('tasks', 'INSERT', taskRecord('a')), idle);
    applyChange(queryClient, W, change('tasks', 'DELETE', taskRecord('a')), idle);
    expect(queryClient.getQueryData<ServerTask[]>(k.tasks())).toEqual([]);
  });

  it('leaves the cache alone while this client is writing the same data', () => {
    const queryClient = clientWith();
    applyChange(queryClient, W, change('tasks', 'INSERT', taskRecord('a')), () => true);
    expect(queryClient.getQueryData<ServerTask[]>(k.tasks())).toEqual([]);
  });

  it('checks the write key of the data it patches', () => {
    const queryClient = clientWith();
    const asked: unknown[] = [];
    applyChange(queryClient, W, change('tasks', 'INSERT', taskRecord('a')), (key) => {
      asked.push(key);
      return false;
    });
    expect(asked).toEqual([[...k.tasks(), 'write']]);
  });

  it('marks the data stale instead of patching while it is being fetched', () => {
    const queryClient = clientWith();
    void queryClient.prefetchQuery({ queryKey: k.tasks(), queryFn: () => new Promise<ServerTask[]>(() => {}) });
    expect(queryClient.isFetching({ queryKey: k.tasks() })).toBe(1);
    applyChange(queryClient, W, change('tasks', 'INSERT', taskRecord('a')), idle);
    expect(queryClient.getQueryData<ServerTask[]>(k.tasks())).toEqual([]);
    expect(queryClient.getQueryState(k.tasks())?.isInvalidated).toBe(true);
  });

  it('ignores data that is not loaded and changes of another wedding', () => {
    const empty = new QueryClient();
    applyChange(empty, W, change('tasks', 'INSERT', taskRecord('a')), idle);
    expect(empty.getQueryData(k.tasks())).toBeUndefined();

    const queryClient = clientWith();
    applyChange(queryClient, W, change('tasks', 'INSERT', taskRecord('a', { wedding_id: 'other' })), idle);
    expect(queryClient.getQueryData<ServerTask[]>(k.tasks())).toEqual([]);
  });
});

describe('applyChange on the budget', () => {
  const line = (id: string, position: number): Record<string, unknown> => ({
    id,
    wedding_id: W,
    name: id,
    unit_price: 100,
    currency: 'RON',
    qty_kind: 'per_guest',
    qty_count: null,
    note: '',
    vendor_id: null,
    paid: null,
    position,
    created_at: '2026-10-07T10:00:00+00:00',
    updated_at: '2026-10-07T10:00:00+00:00',
    updated_by: null,
  });

  it('keeps lines ordered and checks the budget write key', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(k.budgetLines(), []);
    const asked: unknown[] = [];
    const spy = (key: unknown) => {
      asked.push(key);
      return false;
    };
    applyChange(queryClient, W, change('budget_lines', 'INSERT', line('b', 20)), spy);
    applyChange(queryClient, W, change('budget_lines', 'INSERT', line('a', 10)), spy);
    expect(queryClient.getQueryData<BudgetLineRow[]>(k.budgetLines())?.map((l) => l.id)).toEqual(['a', 'b']);
    expect(asked[0]).toEqual([...k.budget(), 'write']);
  });

  it('replaces the settings row and clears it on delete', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(k.budgetSettings(), null);
    const row = { wedding_id: W, gift_per_guest: 300 };
    applyChange(queryClient, W, change('budget_settings', 'UPDATE', row), idle);
    expect(queryClient.getQueryData<BudgetSettingsRow | null>(k.budgetSettings())?.gift_per_guest).toBe(300);
    applyChange(queryClient, W, change('budget_settings', 'DELETE', row), idle);
    expect(queryClient.getQueryData(k.budgetSettings())).toBeNull();
  });
});

describe('applyChange on households and guests', () => {
  const householdRecord = (id: string, over: Record<string, unknown> = {}) => ({
    id,
    wedding_id: W,
    name: `Familia ${id}`,
    side: 'p1',
    notes: '',
    position: 10,
    ...over,
  });
  const guestRecord = (id: string, over: Record<string, unknown> = {}) => ({
    id,
    wedding_id: W,
    household_id: 'h1',
    first_name: id,
    last_name: '',
    age_group: 'adult',
    diet: 'classic',
    attending: 'unknown',
    position: 10,
    ...over,
  });

  it('adds, updates and deletes households', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(k.households(), []);
    applyChange(queryClient, W, change('households', 'INSERT', householdRecord('h2', { position: 20 })), idle);
    applyChange(queryClient, W, change('households', 'INSERT', householdRecord('h1')), idle);
    expect(queryClient.getQueryData<ServerHousehold[]>(k.households())?.map((h) => h.id)).toEqual(['h1', 'h2']);
    applyChange(queryClient, W, change('households', 'UPDATE', householdRecord('h1', { name: 'Nou' })), idle);
    expect(queryClient.getQueryData<ServerHousehold[]>(k.households())?.[0]?.name).toBe('Nou');
    applyChange(queryClient, W, change('households', 'DELETE', householdRecord('h1')), idle);
    expect(queryClient.getQueryData<ServerHousehold[]>(k.households())?.map((h) => h.id)).toEqual(['h2']);
  });

  it('reads the guests again when a household is deleted (DB cascade)', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(k.households(), [householdRecord('h1')]);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    applyChange(queryClient, W, change('households', 'DELETE', householdRecord('h1')), idle);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: k.guests(), exact: true });
  });

  it('patches the guest list and skips it while this client is writing', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(k.guests(), []);
    applyChange(queryClient, W, change('guests', 'INSERT', guestRecord('a')), idle);
    expect(queryClient.getQueryData<ServerGuest[]>(k.guests())).toHaveLength(1);
    const asked: unknown[] = [];
    applyChange(queryClient, W, change('guests', 'INSERT', guestRecord('b')), (key) => {
      asked.push(key);
      return true;
    });
    expect(queryClient.getQueryData<ServerGuest[]>(k.guests())).toHaveLength(1);
    expect(asked[0]).toEqual([...k.guests(), 'write']);
  });
});

describe('subscribeToWedding', () => {
  function fake() {
    let onMessage: (m: { payload?: unknown }) => void = () => {};
    let onStatus: (s: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => void = () => {};
    const channel: RealtimeChannelLike = {
      on: (_type, _filter, cb) => {
        onMessage = cb;
        return channel;
      },
      subscribe: (cb) => {
        onStatus = cb;
      },
    };
    const client: RealtimeClientLike = { channel: vi.fn(() => channel), removeChannel: vi.fn() };
    return {
      client,
      channel,
      message: (p: unknown) => onMessage({ payload: p }),
      status: (s: Parameters<typeof onStatus>[0]) => onStatus(s),
    };
  }

  it('joins the private channel of the wedding', () => {
    const f = fake();
    subscribeToWedding(f.client, clientWith(), W, idle);
    expect(f.client.channel).toHaveBeenCalledWith(`wedding:${W}`, { config: { private: true } });
  });

  it('applies broadcast changes to the cache', () => {
    const f = fake();
    const queryClient = clientWith();
    subscribeToWedding(f.client, queryClient, W, idle);
    f.message({ table: 'tasks', op: 'INSERT', record: taskRecord('a') });
    expect(queryClient.getQueryData<ServerTask[]>(k.tasks())).toHaveLength(1);
  });

  it('ignores a malformed message', () => {
    const f = fake();
    const queryClient = clientWith();
    subscribeToWedding(f.client, queryClient, W, idle);
    f.message({ nope: true });
    expect(queryClient.getQueryData<ServerTask[]>(k.tasks())).toEqual([]);
  });

  it('reads the lists again on every join, the first one included', () => {
    const f = fake();
    const queryClient = clientWith();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    subscribeToWedding(f.client, queryClient, W, idle);
    expect(invalidate).not.toHaveBeenCalled();
    f.status('SUBSCRIBED');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: k.tasks() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: k.budget() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: k.households() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: k.guests() });
    expect(invalidate).toHaveBeenCalledTimes(4);
    f.status('CHANNEL_ERROR');
    expect(invalidate).toHaveBeenCalledTimes(4);
    f.status('SUBSCRIBED');
    expect(invalidate).toHaveBeenCalledTimes(8);
  });

  it('leaves the channel on cleanup', () => {
    const f = fake();
    const off = subscribeToWedding(f.client, clientWith(), W, idle);
    off();
    expect(f.client.removeChannel).toHaveBeenCalledWith(f.channel);
  });
});
