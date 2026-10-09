import { FunctionsHttpError } from '@supabase/supabase-js';
import { useMutation } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';
import { DataError } from './errors';

/**
 * Șterge contul curent (funcția `delete-account`). O cerere care nu a ajuns la server devine `TypeError`
 * („rețea", se poate reîncerca), un răspuns 4xx/5xx un `DataError`.
 */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await getSupabase().functions.invoke('delete-account', { body: { confirm: true } });
  if (!error) return;
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response;
    throw new DataError(await res.text().catch(() => error.message), res.status);
  }
  throw new TypeError(error.message);
}

/** „Șterge contul": apelantul închide sesiunea și duce omul acasă când reușește. Eroarea o arată toast-ul global. */
export function useDeleteAccount() {
  return useMutation({ mutationFn: deleteMyAccount });
}
