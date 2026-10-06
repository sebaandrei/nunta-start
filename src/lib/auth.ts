import type { Messages } from '../i18n';

/**
 * Clientul de autentificare, injectat în ecranul de conectare.
 * Implementarea reală (link magic prin Supabase Auth) e în authSupabase.ts; fără credențiale rămâne cea de mai jos.
 */
export interface AuthClient {
  signInWithGoogle(): Promise<void>;
  sendMagicLink(email: string): Promise<void>;
  /** Codul din același email, tastat în aplicație: merge și când linkul se deschide într-un browser din aplicația de mail. */
  verifyCode(email: string, code: string): Promise<void>;
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

/** Aplicația e doar pe invitație: adresa nu e în lista permisă (declanșatorul din baza de date). */
export class AuthNotInvitedError extends Error {
  constructor() {
    super('Email address is not on the invite list');
    this.name = 'AuthNotInvitedError';
  }
}

/** Prea multe cereri de email într-un timp scurt. */
export class AuthRateLimitError extends Error {
  constructor() {
    super('Too many requests');
    this.name = 'AuthRateLimitError';
  }
}

/** Codul din email e greșit sau a expirat. */
export class AuthInvalidCodeError extends Error {
  constructor() {
    super('Invalid or expired code');
    this.name = 'AuthInvalidCodeError';
  }
}

/** Autentificarea e configurată doar când ambele variabile Supabase sunt setate. */
export function isAuthConfiguredFor(env: {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}): boolean {
  return Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY);
}

export function isAuthConfigured(): boolean {
  return isAuthConfiguredFor(import.meta.env);
}

/** Clientul implicit: refuză sincer, ca interfața să nu pretindă niciodată că a trimis un email. */
export const notConfiguredAuthClient: AuthClient = {
  signInWithGoogle: () => Promise.reject(new AuthNotConfiguredError()),
  sendMagicLink: () => Promise.reject(new AuthNotConfiguredError()),
  verifyCode: () => Promise.reject(new AuthNotConfiguredError()),
};

export type AuthErrorKind =
  | 'notConfigured'
  | 'invalidEmail'
  | 'network'
  | 'notInvited'
  | 'rateLimited'
  | 'invalidCode'
  | 'generic';

export function authErrorKind(error: unknown): AuthErrorKind {
  if (error instanceof AuthNotConfiguredError) return 'notConfigured';
  if (error instanceof AuthInvalidEmailError) return 'invalidEmail';
  if (error instanceof AuthNotInvitedError) return 'notInvited';
  if (error instanceof AuthRateLimitError) return 'rateLimited';
  if (error instanceof AuthInvalidCodeError) return 'invalidCode';
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

/** Codul din email: exact 6 cifre (spațiile de la copiere se ignoră). */
export function normalizeCode(raw: string): string | null {
  const code = raw.replace(/\s+/g, '');
  return /^\d{6}$/.test(code) ? code : null;
}

/** Secunde rămase, ca m:ss (30 devine „0:30"). */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
