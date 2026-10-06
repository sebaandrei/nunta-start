/** Eroare de date cu un status de tip HTTP, ca `errorStatus` (reîncercări, toast) să funcționeze la fel peste tot. */
export class DataError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'DataError';
    this.status = status;
    this.code = code;
  }
}

/** Forma minimă a răspunsului supabase-js (data/error/status), ca să se poată testa fără client. */
export interface ResponseLike<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
  status: number;
}

/**
 * Răspunsul sau o eroare tipizată. Cererea căzută din rețea (status 0) devine `TypeError`,
 * cum o recunoaște deja `errorToMessage`, și se reîncearcă. Un 4xx nu se reîncearcă.
 */
export function unwrap<T>(res: ResponseLike<T>): T {
  if (res.error) {
    if (res.status === 0) throw new TypeError(res.error.message);
    throw new DataError(res.error.message, res.status >= 400 ? res.status : 500, res.error.code);
  }
  return res.data as T;
}

/** Ca `unwrap`, dar un rând care lipsește (RLS sau id greșit) e o eroare 404. */
export function unwrapOne<T>(res: ResponseLike<T>): NonNullable<T> {
  const data = unwrap(res);
  if (data === null || data === undefined) throw new DataError('Not found', 404, 'PGRST116');
  return data as NonNullable<T>;
}

/** Limita de nunți pe proprietar atinsă (RPC-ul ridică P0001 cu acest text). */
export function isWeddingLimitError(error: unknown): boolean {
  return error instanceof DataError && /wedding limit reached/i.test(error.message);
}
