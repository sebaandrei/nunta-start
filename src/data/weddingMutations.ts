import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { Locale } from '../lib/locale';
import { keys } from '../lib/queryKeys';
import {
  applyWeddingUpdate,
  type CreateWeddingInput,
  type Wedding,
  type WeddingPatch,
  type WeddingUpdate,
  weddingPatchToUpdate,
} from './mappers';
import { weddingQuery } from './queries';
import { createWedding, softDeleteWedding, updateWedding } from './weddings';

/**
 * Creează o nuntă (RPC `create_wedding`) cu șabloanele limbii active și reîmprospătează lista nunților.
 * `silent`: eroarea o arată Onboarding într-o bandă, nu un toast.
 */
export function useCreateWedding() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { silent: true },
    mutationFn: ({ input, locale }: { input: CreateWeddingInput; locale: Locale }) => createWedding(input, locale),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.list() }),
  });
}

/**
 * Modifică nunta (nume, dată, oraș, parteneri, curs, monedă, nași) cu update optimist pe `weddingQuery(id)`,
 * de unde citesc layoutul, Setările și termenele taskurilor. Trimite doar coloanele schimbate. La eroare,
 * nunta revine la ce era (toast-ul vine din `MutationCache`), dacă nu mai sunt scrieri în zbor; altfel se
 * resincronizează de pe server la final. Lista nunților se reîmprospătează oricum.
 */
export function useWeddingMutation(weddingId: string) {
  const queryClient = useQueryClient();
  const key = weddingQuery(weddingId).queryKey;
  const mutationKey = [...key, 'write'] as const;
  const inFlight = () => queryClient.isMutating({ mutationKey });
  const { mutate } = useMutation({
    mutationKey,
    scope: { id: `wedding:${weddingId}` },
    mutationFn: (update: WeddingUpdate) => updateWedding(weddingId, update),
    onMutate: async (update: WeddingUpdate) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Wedding | null>(key);
      if (previous) queryClient.setQueryData(key, applyWeddingUpdate(previous, update));
      return { previous };
    },
    onError: (_error, _update, context) => {
      if (context?.previous && inFlight() <= 1) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      if (inFlight() <= 1) void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: keys.list() });
    },
  });

  return useCallback(
    (patch: WeddingPatch) => {
      const current = queryClient.getQueryData<Wedding | null>(key);
      if (!current) return;
      const update = weddingPatchToUpdate(current, patch);
      if (Object.keys(update).length > 0) mutate(update);
    },
    [queryClient, key, mutate],
  );
}

/**
 * Șterge „moale" nunta (doar proprietarul). Nu e optimist: ecranul rămâne până răspunde serverul, apoi
 * lista nunților se reîmprospătează; apelantul navighează la alegerea nunții.
 */
export function useDeleteWedding(weddingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => softDeleteWedding(weddingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.list() }),
  });
}
