import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ro } from '../i18n/ro';
import { showToast } from './toast';

function statusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const { status } = error as { status?: unknown };
  return typeof status === 'number' ? status : undefined;
}

/** Erorile 4xx nu se repetă: cererea e greșită, nu rețeaua. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = statusOf(error);
  if (status !== undefined && status >= 400 && status < 500) return false;
  return failureCount < 2;
}

export function errorToMessage(error: unknown): string {
  const status = statusOf(error);
  if (status === 401 || status === 403) return ro.errors.forbidden;
  if (error instanceof TypeError) return ro.errors.network;
  return ro.errors.generic;
}

const onError = (error: unknown) => showToast(errorToMessage(error));

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    queries: { staleTime: 30_000, retry: shouldRetry },
  },
});
