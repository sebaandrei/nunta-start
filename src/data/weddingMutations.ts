import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Locale } from '../lib/locale';
import { keys } from '../lib/queryKeys';
import type { CreateWeddingInput } from './mappers';
import { createWedding } from './weddings';

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
