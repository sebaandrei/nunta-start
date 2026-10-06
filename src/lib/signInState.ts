import type { AuthErrorKind, EmailIssue } from './auth';
import { validateEmail } from './auth';

export const RESEND_SECONDS = 30;

export type SignInStatus = 'idle' | 'sending' | 'sent' | 'error' | 'expired';

export interface SignInState {
  status: SignInStatus;
  email: string;
  /** Eroarea câmpului de email (validare locală). */
  fieldError: EmailIssue | null;
  /** Tipul erorii, doar în starea `error`. */
  errorKind: AuthErrorKind | null;
  /** Secunde până la care „Retrimite" rămâne dezactivat, doar în starea `sent`. */
  resendIn: number;
  /** Retrimiterea e în curs: ecranul rămâne pe „sent", cu butonul ocupat. */
  resending: boolean;
}

export type SignInEvent =
  | { type: 'edit'; email: string }
  | { type: 'submit' }
  | { type: 'resend' }
  | { type: 'google' }
  | { type: 'succeeded' }
  | { type: 'failed'; kind: AuthErrorKind }
  | { type: 'tick' }
  | { type: 'useOther' };

export function initialSignInState(status: 'idle' | 'expired' = 'idle'): SignInState {
  return { status, email: '', fieldError: null, errorKind: null, resendIn: 0, resending: false };
}

/** Funcție pură: starea ecranului de conectare. Efectele (apelul clientului) sunt în componentă. */
export function signInReducer(state: SignInState, event: SignInEvent): SignInState {
  switch (event.type) {
    case 'edit':
      return state.status === 'sending' ? state : { ...state, email: event.email, fieldError: null };
    case 'submit': {
      if (state.status === 'sending' || state.status === 'sent') return state;
      const fieldError = validateEmail(state.email);
      if (fieldError) return { ...state, fieldError };
      return { ...state, status: 'sending', fieldError: null, errorKind: null };
    }
    case 'resend':
      if (state.status !== 'sent' || state.resendIn > 0) return state;
      return { ...state, status: 'sending', errorKind: null, resending: true };
    case 'google':
      if (state.status === 'sending') return state;
      return { ...state, status: 'sending', fieldError: null, errorKind: null };
    case 'succeeded':
      // Doar linkul pe email duce la „sent"; Google redirecționează, iar clientul real nu revine aici.
      return state.status === 'sending'
        ? { ...state, status: 'sent', resendIn: RESEND_SECONDS, resending: false }
        : state;
    case 'failed':
      return state.status === 'sending'
        ? { ...state, status: 'error', errorKind: event.kind, resending: false }
        : state;
    case 'tick':
      return state.status === 'sent' && state.resendIn > 0 ? { ...state, resendIn: state.resendIn - 1 } : state;
    case 'useOther':
      return initialSignInState();
  }
}
