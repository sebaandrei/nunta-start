import { type QueryClient, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { parseISODate, startOfDay, toISODate } from '../domain/dates';
import { createTask } from '../domain/initial';
import { defaultDateForNewTask, nextStatus } from '../domain/tasks';
import { keys } from '../lib/queryKeys';
import { changedPatch, nextPosition, type ServerTask, type TaskUpdate, taskPatchToUpdate } from './mappers';
import { weddingQuery } from './queries';
import { deleteTask, insertTask, updateTask } from './tasks';

export type TaskPatch = Partial<Omit<ServerTask, 'id'>>;

export interface TaskActions {
  /** Adaugă un task gol cu termenul etapei curente; întoarce id-ul (UUID de client) ca ecranul să-l poată deschide. */
  add(): string;
  /** Doar câmpurile care chiar s-au schimbat pleacă spre server; nimic schimbat = nicio cerere. */
  update(id: string, patch: TaskPatch): void;
  remove(id: string): void;
  cycleStatus(id: string): void;
}

/** Ordinea strictă a scrierilor pe o nuntă: un update nu poate ajunge la server înaintea insert-ului lui. */
const scopeFor = (weddingId: string) => ({ id: `tasks:${weddingId}` });

/**
 * Mutație cu update optimist al listei din cache. La eroare, lista revine la ce era (toast-ul vine din
 * `MutationCache`). Dacă mai sunt scrieri în zbor, nu restaurăm instantaneul (ar șterge și munca lor):
 * se resincronizează de pe server când ultima se termină. Un strat realtime poate corecta aceeași listă
 * cu `setQueryData` pe `keys.wedding(id).tasks()`.
 */
function useTaskMutation<V>(
  weddingId: string,
  mutationFn: (variables: V) => Promise<unknown>,
  apply: (tasks: ServerTask[], variables: V) => ServerTask[],
) {
  const queryClient = useQueryClient();
  const key = keys.wedding(weddingId).tasks();
  const mutationKey = [...key, 'write'] as const;
  const inFlight = () => queryClient.isMutating({ mutationKey });
  return useMutation({
    mutationKey,
    scope: scopeFor(weddingId),
    mutationFn,
    onMutate: async (variables: V) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ServerTask[]>(key);
      if (previous) queryClient.setQueryData(key, apply(previous, variables));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous && inFlight() <= 1) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      if (inFlight() <= 1) void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

const cached = (queryClient: QueryClient, weddingId: string) =>
  queryClient.getQueryData<ServerTask[]>(keys.wedding(weddingId).tasks()) ?? [];

/** Taskurile unei nunți: adăugare, editare, ștergere, ciclarea statusului, toate optimiste. */
export function useTaskActions(weddingId: string): TaskActions {
  const queryClient = useQueryClient();
  const { data: wedding } = useSuspenseQuery(weddingQuery(weddingId));
  const weddingDate = wedding?.date ?? null;

  const addM = useTaskMutation<ServerTask>(
    weddingId,
    (task) => insertTask(weddingId, task),
    (tasks, task) => [...tasks, task],
  );
  const updateM = useTaskMutation<{ id: string; update: TaskUpdate; patch: TaskPatch }>(
    weddingId,
    ({ id, update }) => updateTask(id, update),
    (tasks, { id, patch }) => tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  );
  const removeM = useTaskMutation<string>(
    weddingId,
    (id) => deleteTask(id),
    (tasks, id) => tasks.filter((t) => t.id !== id),
  );

  const { mutate: add } = addM;
  const { mutate: update } = updateM;
  const { mutate: remove } = removeM;

  return useMemo<TaskActions>(() => {
    const send = (id: string, patch: TaskPatch) => {
      const current = cached(queryClient, weddingId).find((t) => t.id === id);
      if (!current) return;
      const changed = changedPatch(current, patch);
      if (Object.keys(changed).length === 0) return;
      update({ id, patch: changed, update: taskPatchToUpdate(changed) });
    };
    return {
      add: () => {
        const today = startOfDay(new Date());
        const due = weddingDate ? defaultDateForNewTask(parseISODate(weddingDate), today) : today;
        const task: ServerTask = {
          ...createTask(toISODate(due), () => crypto.randomUUID()),
          position: nextPosition(cached(queryClient, weddingId)),
        };
        add(task);
        return task.id;
      },
      update: send,
      remove: (id) => remove(id),
      cycleStatus: (id) => {
        const current = cached(queryClient, weddingId).find((t) => t.id === id);
        if (current) send(id, { status: nextStatus(current.status) });
      },
    };
  }, [queryClient, weddingId, weddingDate, add, update, remove]);
}
