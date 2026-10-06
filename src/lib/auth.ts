import type { Messages } from '../i18n';

/**
 * Clientul de autentificare, injectat în ecranul de conectare.
 * Implementarea reală (Supabase Auth, Google, link magic, Turnstile) vine cu NS-022.
 */
export interface AuthClient {
  signInWithGoogle(): Promise<void>;
  sendMagicLink(email: string, captchaToken?: string): Promise<void>;
}

/** Autentificarea nu e configurată încă (lipsesc credențialele). */
export class AuthNotConfiguredError extends Error {
  constructor() {
    super('Authentication is not configured');
    this.name = 'AuthNotConfiguredError';
  }
}

/** Serverul a respins adresa de email. */
export class AuthInvalidEmailError extends Error {
  constructor() {
    super('Invalid email address');
    this.name = 'AuthInvalidEmailError';
  }
}

/** Cererea nu a ajuns la server. */
export class AuthNetworkError extends Error {
  constructor() {
    super('Network error');
    this.name = 'AuthNetworkError';
  }
}

/** Clientul implicit: refuză sincer, ca interfața să nu pretindă niciodată că a trimis un email. */
export const notConfiguredAuthClient: AuthClient = {
  signInWithGoogle: () => Promise.reject(new AuthNotConfiguredError()),
  sendMagicLink: () => Promise.reject(new AuthNotConfiguredError()),
};

export type AuthErrorKind = 'notConfigured' | 'invalidEmail' | 'network' | 'generic';

export function authErrorKind(error: unknown): AuthErrorKind {
  if (error instanceof AuthNotConfiguredError) return 'notConfigured';
  if (error instanceof AuthInvalidEmailError) return 'invalidEmail';
  if (error instanceof AuthNetworkError || error instanceof TypeError) return 'network';
  return 'generic';
}

export function authErrorMessage(kind: AuthErrorKind, t: Messages): string {
  return t.auth.errors[kind];
}

export type EmailIssue = 'empty' | 'invalid';

/** Verificare tolerantă: ceva@domeniu.tld, fără spații. Serverul are ultimul cuvânt. */
export function validateEmail(raw: string): EmailIssue | null {
  const email = raw.trim();
  if (email === '') return 'empty';
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email) ? null : 'invalid';
}

/** Secunde rămase, ca m:ss (30 devine „0:30"). */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
