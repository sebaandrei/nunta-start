import { create } from 'zustand';
import { isAuthConfigured } from './auth';
import { queryClient } from './queryClient';

export type SessionStatus = 'disabled' | 'unknown' | 'signedOut' | 'signedIn';

export interface SessionUser {
  id: string;
  email: string | null;
}

interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
}

/** Forma minimă a sesiunii Supabase. */
export interface SessionLike {
  user: { id: string; email?: string | null };
}

export function stateFromSession(session: SessionLike | null | undefined): SessionState {
  return session
    ? { status: 'signedIn', user: { id: session.user.id, email: session.user.email ?? null } }
    : { status: 'signedOut', user: null };
}

export const initialSessionState = (configured: boolean): SessionState => ({
  status: configured ? 'unknown' : 'disabled',
  user: null,
});

export const useSession = create<SessionState>(() => initialSessionState(isAuthConfigured()));

export function setSession(session: SessionLike | null): void {
  useSession.setState(stateFromSession(session));
}

let started: Promise<void> | null = null;

/** O singură dată, la pornire: citește sesiunea și o ține la zi. Fără credențiale nu face nimic. */
export function initSession(): Promise<void> {
  if (!isAuthConfigured()) return Promise.resolve();
  started ??= import('./supabase').then(async ({ getSupabase }) => {
    const auth = getSupabase().auth;
    auth.onAuthStateChange((_event, session) => setSession(session));
    const { data } = await auth.getSession();
    setSession(data.session);
  });
  return started;
}

/** Deconectare: închide sesiunea, golește starea și cache-ul de date. */
export async function signOut(): Promise<void> {
  try {
    const { getSupabase } = await import('./supabase');
    await getSupabase().auth.signOut();
  } finally {
    setSession(null);
    queryClient.clear();
  }
}
