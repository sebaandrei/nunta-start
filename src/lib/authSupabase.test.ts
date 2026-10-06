import { describe, expect, it } from 'vitest';
import {
  AuthInvalidCodeError,
  AuthInvalidEmailError,
  AuthNetworkError,
  AuthNotInvitedError,
  AuthRateLimitError,
  authErrorKind,
  isAuthConfiguredFor,
} from './auth';
import { mapSupabaseAuthError } from './authSupabase';

describe('mapSupabaseAuthError', () => {
  it('maps the invite-only trigger error', () => {
    const e = { message: 'Database error saving new user', status: 500, code: 'unexpected_failure' };
    expect(mapSupabaseAuthError(e)).toBeInstanceOf(AuthNotInvitedError);
    expect(mapSupabaseAuthError({ message: 'DATABASE ERROR SAVING NEW USER' })).toBeInstanceOf(AuthNotInvitedError);
    expect(mapSupabaseAuthError({ code: 'unexpected_failure' })).toBeInstanceOf(AuthNotInvitedError);
    // Forma observată în supabase-js local: AuthRetryableFetchError, 500, fără cod.
    expect(
      mapSupabaseAuthError({ name: 'AuthRetryableFetchError', message: 'Database error saving new user', status: 500 }),
    ).toBeInstanceOf(AuthNotInvitedError);
    expect(mapSupabaseAuthError({ message: 'signup_not_allowed', code: 'P0001' })).toBeInstanceOf(AuthNotInvitedError);
  });
  it('maps rate limits', () => {
    expect(mapSupabaseAuthError({ code: 'over_email_send_rate_limit', status: 429 })).toBeInstanceOf(
      AuthRateLimitError,
    );
    expect(mapSupabaseAuthError({ message: 'x', status: 429 })).toBeInstanceOf(AuthRateLimitError);
  });
  it('maps invalid or expired code', () => {
    expect(mapSupabaseAuthError({ code: 'otp_expired', status: 403 })).toBeInstanceOf(AuthInvalidCodeError);
    expect(mapSupabaseAuthError({ message: 'Token has expired or is invalid', status: 403 })).toBeInstanceOf(
      AuthInvalidCodeError,
    );
    expect(authErrorKind(new AuthInvalidCodeError())).toBe('invalidCode');
  });
  it('maps invalid email and network', () => {
    expect(mapSupabaseAuthError({ code: 'email_address_invalid' })).toBeInstanceOf(AuthInvalidEmailError);
    expect(mapSupabaseAuthError({ message: 'Unable to validate email address: invalid format' })).toBeInstanceOf(
      AuthInvalidEmailError,
    );
    expect(
      mapSupabaseAuthError({ name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 }),
    ).toBeInstanceOf(AuthNetworkError);
  });
  it('maps anything else to a generic error', () => {
    expect(authErrorKind(mapSupabaseAuthError({ message: 'boom', status: 500 }))).toBe('generic');
  });
  it('exposes the new kinds', () => {
    expect(authErrorKind(new AuthNotInvitedError())).toBe('notInvited');
    expect(authErrorKind(new AuthRateLimitError())).toBe('rateLimited');
  });
});

describe('isAuthConfiguredFor', () => {
  it('needs both variables', () => {
    expect(isAuthConfiguredFor({})).toBe(false);
    expect(isAuthConfiguredFor({ VITE_SUPABASE_URL: 'http://x' })).toBe(false);
    expect(isAuthConfiguredFor({ VITE_SUPABASE_URL: 'http://x', VITE_SUPABASE_PUBLISHABLE_KEY: 'k' })).toBe(true);
  });
});
