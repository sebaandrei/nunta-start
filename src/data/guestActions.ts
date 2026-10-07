import { type QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { Owner } from '../domain/schema';
import { keys } from '../lib/queryKeys';
import { deleteGuest, deleteHousehold, insertGuest, insertHousehold, updateGuest, updateHousehold } from './guests';
import {
  type GuestPatch,
  guestPatchToUpdate,
  type HouseholdPatch,
  householdPatchToUpdate,
  nextPosition,
  type ServerGuest,
  type ServerHousehold,
} from './mappers';

export interface GuestActions {
  /** Familie nouă, goală; întoarce id-ul (UUID de client). */
  addHousehold(side: Owner): string;
  updateHousehold(id: string, patch: HouseholdPatch): void;
  /** Șterge familia și invitații ei. */
  removeHousehold(id: string): void;
  addGuest(householdId: string): string;
  updateGuest(id: string, patch: GuestPatch): void;
  removeGuest(id: string): void;
}

/** Ordinea strictă a scrierilor pe o nuntă: un update nu poate ajunge la server înaintea insert-ului lui. */
const scopeFor = (weddingId: string) => ({ id: `guests:${weddingId}` });

/** Mutație cu update optimist al unei liste din cache; aceeași strategie ca la taskuri (vezi taskActions.ts). */
function useListMutation<Item extends { id: string }, V>(
  weddingId: string,
  key: QueryKey,
  mutationFn: (variables: V) => Promise<unknown>,
  apply: (items: Item[], variables: V) => Item[],
) {
  const queryClient = useQueryClient();
  const mutationKey = [...key, 'write'] as const;
  const inFlight = () => queryClient.isMutating({ mutationKey });
  return useMutation({
    mutationKey,
    scope: scopeFor(weddingId),
    mutationFn,
    onMutate: async (variables: V) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Item[]>(key);
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

/** Familiile și invitații unei nunți: adăugare, editare, ștergere, toate optimiste. */
export function useGuestActions(weddingId: string): GuestActions {
  const queryClient = useQueryClient();
  const householdsKey = keys.wedding(weddingId).households();
  const guestsKey = keys.wedding(weddingId).guests();

  const addH = useListMutation<ServerHousehold, ServerHousehold>(
    weddingId,
    householdsKey,
    (h) => insertHousehold(weddingId, h),
    (list, h) => [...list, h],
  );
  const updateH = useListMutation<ServerHousehold, { id: string; patch: HouseholdPatch }>(
    weddingId,
    householdsKey,
    ({ id, patch }) => updateHousehold(id, householdPatchToUpdate(patch)),
    (list, { id, patch }) => list.map((h) => (h.id === id ? { ...h, ...patch } : h)),
  );
  const removeH = useListMutation<ServerHousehold, string>(weddingId, householdsKey, deleteHousehold, (list, id) =>
    list.filter((h) => h.id !== id),
  );
  const addG = useListMutation<ServerGuest, ServerGuest>(
    weddingId,
    guestsKey,
    (g) => insertGuest(weddingId, g),
    (list, g) => [...list, g],
  );
  const updateG = useListMutation<ServerGuest, { id: string; patch: GuestPatch }>(
    weddingId,
    guestsKey,
    ({ id, patch }) => updateGuest(id, guestPatchToUpdate(patch)),
    (list, { id, patch }) => list.map((g) => (g.id === id ? { ...g, ...patch } : g)),
  );
  const removeG = useListMutation<ServerGuest, string>(weddingId, guestsKey, deleteGuest, (list, id) =>
    list.filter((g) => g.id !== id),
  );

  const { mutate: addHousehold } = addH;
  const { mutate: updateHouseholdM } = updateH;
  const { mutate: removeHousehold } = removeH;
  const { mutate: addGuest } = addG;
  const { mutate: updateGuestM } = updateG;
  const { mutate: removeGuest } = removeG;

  return useMemo<GuestActions>(() => {
    const householdsKey = keys.wedding(weddingId).households();
    const guestsKey = keys.wedding(weddingId).guests();
    const cachedHouseholds = () => queryClient.getQueryData<ServerHousehold[]>(householdsKey) ?? [];
    const cachedGuests = () => queryClient.getQueryData<ServerGuest[]>(guestsKey) ?? [];
    /** Doar câmpurile care chiar s-au schimbat pleacă spre server. */
    const changed = <T extends object>(current: T | undefined, patch: Partial<T>): Partial<T> | null => {
      if (!current) return null;
      const out = Object.fromEntries(
        Object.entries(patch).filter(([k, v]) => v !== undefined && v !== current[k as keyof T]),
      ) as Partial<T>;
      return Object.keys(out).length > 0 ? out : null;
    };
    return {
      addHousehold: (side) => {
        const household: ServerHousehold = {
          id: crypto.randomUUID(),
          name: '',
          side,
          notes: '',
          position: nextPosition(cachedHouseholds()),
        };
        addHousehold(household);
        return household.id;
      },
      updateHousehold: (id, patch) => {
        const diff = changed(
          cachedHouseholds().find((h) => h.id === id),
          patch,
        );
        if (diff) updateHouseholdM({ id, patch: diff });
      },
      removeHousehold: (id) => {
        // Cascada din DB șterge invitații familiei; lista lor din cache o urmează imediat.
        queryClient.setQueryData<ServerGuest[]>(
          guestsKey,
          cachedGuests().filter((g) => g.householdId !== id),
        );
        removeHousehold(id, { onSettled: () => void queryClient.invalidateQueries({ queryKey: guestsKey }) });
      },
      addGuest: (householdId) => {
        const guest: ServerGuest = {
          id: crypto.randomUUID(),
          householdId,
          firstName: '',
          lastName: '',
          ageGroup: 'adult',
          diet: 'classic',
          attending: 'unknown',
          position: nextPosition(cachedGuests()),
        };
        addGuest(guest);
        return guest.id;
      },
      updateGuest: (id, patch) => {
        const diff = changed(
          cachedGuests().find((g) => g.id === id),
          patch,
        );
        if (diff) updateGuestM({ id, patch: diff });
      },
      removeGuest: (id) => removeGuest(id),
    };
  }, [queryClient, weddingId, addHousehold, updateHouseholdM, removeHousehold, addGuest, updateGuestM, removeGuest]);
}
