import { paths } from './paths';

const NEXT_KEY = 'nunta.authNext';

/** Doar căi relative din aplicație (/w, /w/..., /invite/<token>): orice altceva, inclusiv adrese externe, devine /w. */
export function safeNext(raw: string | null | undefined): string {
  const hasControlOrBackslash = (s: string) => [...s].some((c) => c === '\\' || c.charCodeAt(0) < 32);
  if (!raw || !/^\/(?:w(?:[/?#]|$)|invite\/[A-Za-z0-9_-]{1,128}$)/.test(raw) || hasControlOrBackslash(raw))
    return paths.workspaces;
  try {
    const url = new URL(raw, 'http://local.invalid');
    return url.origin === 'http://local.invalid' ? raw : paths.workspaces;
  } catch {
    return paths.workspaces;
  }
}

export function rememberNext(next: string): void {
  try {
    localStorage.setItem(NEXT_KEY, next);
  } catch {
    // Fără stocare, omul ajunge simplu pe /w.
  }
}

/** Începutul unei încercări de conectare: șterge destinația rămasă de la alta și o păstrează pe cea cerută acum. */
export function beginAttempt(search: string): void {
  clearNext();
  rememberNext(safeNext(new URLSearchParams(search).get('next')));
}

function clearNext(): void {
  try {
    localStorage.removeItem(NEXT_KEY);
  } catch {
    // Fără stocare nu există nimic de șters.
  }
}

/** Citește destinația păstrată și o șterge, ca să nu o folosească altă încercare. */
export function takeNext(): string {
  try {
    const next = localStorage.getItem(NEXT_KEY);
    localStorage.removeItem(NEXT_KEY);
    return safeNext(next);
  } catch {
    return paths.workspaces;
  }
}

export type CallbackParams =
  | { kind: 'expired' }
  | { kind: 'error' }
  | { kind: 'code'; code: string }
  | { kind: 'tokens' }
  | { kind: 'none' };

/** Ce ne-a adus Supabase în adresă: eroare (în query sau în hash), cod PKCE sau token din fluxul implicit. */
export function parseCallback(search: string, hash: string): CallbackParams {
  const q = new URLSearchParams(search);
  const h = new URLSearchParams(hash.replace(/^#/, ''));
  const get = (k: string) => q.get(k) ?? h.get(k);
  if (get('error') || get('error_code') || get('error_description')) {
    const code = get('error_code');
    return code === 'otp_expired' || code === 'flow_state_expired' || code === 'flow_state_not_found'
      ? { kind: 'expired' }
      : { kind: 'error' };
  }
  const code = q.get('code');
  if (code) return { kind: 'code', code };
  if (h.get('access_token')) return { kind: 'tokens' };
  return { kind: 'none' };
}

export const loginHref = (next: string, error?: 'expired') => {
  const params = new URLSearchParams();
  if (error) params.set('error', error);
  else params.set('next', next);
  return `${paths.login}?${params}`;
};
