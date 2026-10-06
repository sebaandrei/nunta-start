import { type AuthClient, AuthNetworkError } from './auth';
import { initialSignInState, type SignInState } from './signInState';

/**
 * Doar pentru teste unitare și pentru previzualizarea din dev (`/login?preview=…`).
 * Ecranul îl importă numai sub `import.meta.env.DEV`, deci nu ajunge în build-ul de producție.
 */
export type AuthOutcome = 'success' | 'network';

export function createFakeAuthClient(outcome: AuthOutcome = 'success'): AuthClient {
  const run = () => (outcome === 'success' ? Promise.resolve() : Promise.reject(new AuthNetworkError()));
  return { signInWithGoogle: run, sendCode: run, verifyCode: run };
}

const PREVIEWS = ['sent', 'expired', 'error', 'not-invited', 'rate-limited'] as const;
export type PreviewName = (typeof PREVIEWS)[number];

export interface Preview {
  state: SignInState;
  client: AuthClient;
}

export function parsePreview(raw: string | null): PreviewName | null {
  return PREVIEWS.find((name) => name === raw) ?? null;
}

export function previewFor(name: PreviewName): Preview {
  const email = 'voi@exemplu.ro';
  const base = initialSignInState();
  switch (name) {
    case 'sent':
      return { state: { ...base, status: 'sent', email, resendIn: 30 }, client: createFakeAuthClient() };
    case 'expired':
      return { state: { ...base, status: 'expired', email }, client: createFakeAuthClient() };
    case 'error':
      return {
        state: { ...base, status: 'error', email, errorKind: 'network' },
        client: createFakeAuthClient('network'),
      };
    case 'not-invited':
      return { state: { ...base, status: 'error', email, errorKind: 'notInvited' }, client: createFakeAuthClient() };
    case 'rate-limited':
      return { state: { ...base, status: 'error', email, errorKind: 'rateLimited' }, client: createFakeAuthClient() };
  }
}
