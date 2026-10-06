import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { getMessages } from '../i18n';
import { showToast } from './toast';

/** HTTP-like status of an error: `status` when present, else derived from PostgREST/Postgres codes (PostgrestError has no status). */
export function errorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const { status, code } = error as { status?: unknown; code?: unknown };
  if (typeof status === 'number') return status;
  if (typeof code !== 'string') return undefined;
  if (code === 'PGRST301' || code === 'PGRST302') return 401;
  if (code === '42501') return 403;
  if (code === 'PGRST116') return 404;
  if (code.length === 5 && ['22', '23', '42'].includes(code.slice(0, 2))) return 400;
  return undefined;
}

/** Erorile 4xx nu se repetă: cererea e greșită, nu rețeaua. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = errorStatus(error);
  if (status !== undefined && status >= 400 && status < 500) return false;
  return failureCount < 2;
}

export function errorToMessage(error: unknown): string {
  const status = errorStatus(error);
  const { errors } = getMessages();
  if (status === 401 || status === 403) return errors.forbidden;
  if (error instanceof TypeError) return errors.network;
  return errors.generic;
}

const onError = (error: unknown) => showToast(errorToMessage(error));

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    queries: { staleTime: 30_000, retry: shouldRetry },
  },
});
