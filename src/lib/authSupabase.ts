import {
  type AuthClient,
  AuthInvalidCodeError,
  AuthInvalidEmailError,
  AuthNetworkError,
  AuthNotInvitedError,
  AuthRateLimitError,
} from './auth';
import { beginAttempt } from './authCallback';
import { setSession } from './session';

/** Forma minimă a unei erori Supabase Auth, ca maparea să se poată testa fără client. */
export interface SupabaseAuthErrorLike {
  name?: string;
  message?: string;
  status?: number;
  code?: string;
}

/**
 * Traduce eroarea Supabase în erorile tipizate ale aplicației.
 * Declanșatorul de invitații răspunde cu „Database error saving new user" (500, unexpected_failure).
 */
export function mapSupabaseAuthError(error: SupabaseAuthErrorLike): Error {
  const message = (error.message ?? '').toLowerCase();
  const code = (error.code ?? '').toLowerCase();
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || error.status === 429) {
    return new AuthRateLimitError();
  }
  if (
    code === 'unexpected_failure' ||
    message.includes('database error saving new user') ||
    message.includes('signup_not_allowed')
  ) {
    return new AuthNotInvitedError();
  }
  if (code === 'otp_expired' || message.includes('token has expired or is invalid')) {
    return new AuthInvalidCodeError();
  }
  if (code === 'email_address_invalid' || /invalid.*email|email.*invalid/.test(message)) {
    return new AuthInvalidEmailError();
  }
  if (error.name === 'AuthRetryableFetchError' || message.includes('failed to fetch') || error.status === 0) {
    return new AuthNetworkError();
  }
  return new Error(error.message ?? 'Authentication failed');
}

/** Supabase e importat leneș: fără credențiale, codul lui nu se încarcă deloc. */
const supabase = () => import('./supabase').then((m) => m.getSupabase());

/** Adresa la care Supabase trimite omul după ce apasă pe link. */
export const callbackUrl = () => `${window.location.origin}/auth/callback`;

export const supabaseAuthClient: AuthClient = {
  async sendMagicLink(email) {
    // Linkul se deschide adesea în altă filă: `next` se păstrează în localStorage, nu în adresă.
    beginAttempt(window.location.search);
    const { error } = await (await supabase()).auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl(), shouldCreateUser: true },
    });
    if (error) throw mapSupabaseAuthError(error);
  },
  async verifyCode(email, code) {
    const { data, error } = await (await supabase()).auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) throw mapSupabaseAuthError(error);
    setSession(data.session);
  },
  /** Implementat, dar neafișat: vezi VITE_AUTH_GOOGLE. */
  async signInWithGoogle() {
    beginAttempt(window.location.search);
    const { error } = await (await supabase()).auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl() },
    });
    if (error) throw mapSupabaseAuthError(error);
  },
};
