import { describe, expect, it } from 'vitest';
import { getMessages } from '../i18n';
import {
  AuthInvalidEmailError,
  AuthNetworkError,
  AuthNotConfiguredError,
  authErrorKind,
  authErrorMessage,
  formatCountdown,
  notConfiguredAuthClient,
  validateEmail,
} from './auth';
import { createFakeAuthClient, parsePreview, previewFor } from './authPreview';

describe('validateEmail', () => {
  it('accepts ordinary and tolerant addresses', () => {
    for (const ok of ['voi@exemplu.ro', ' voi@exemplu.ro ', 'a.b+c@sub.exemplu.co.uk', 'ștefan@exemplu.ro']) {
      expect(validateEmail(ok)).toBeNull();
    }
  });
  it('flags empty input', () => {
    expect(validateEmail('')).toBe('empty');
    expect(validateEmail('   ')).toBe('empty');
  });
  it('flags incomplete addresses', () => {
    for (const bad of ['voi', 'voi@', '@exemplu.ro', 'voi@exemplu', 'voi@exemplu.', 'voi @exemplu.ro', 'a@b@c.ro']) {
      expect(validateEmail(bad)).toBe('invalid');
    }
  });
});

describe('formatCountdown', () => {
  it('formats m:ss', () => {
    expect(formatCountdown(30)).toBe('0:30');
    expect(formatCountdown(9)).toBe('0:09');
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(75)).toBe('1:15');
    expect(formatCountdown(-3)).toBe('0:00');
  });
});

describe('error mapping', () => {
  it('maps error types to kinds', () => {
    expect(authErrorKind(new AuthNotConfiguredError())).toBe('notConfigured');
    expect(authErrorKind(new AuthInvalidEmailError())).toBe('invalidEmail');
    expect(authErrorKind(new AuthNetworkError())).toBe('network');
    expect(authErrorKind(new TypeError('Failed to fetch'))).toBe('network');
    expect(authErrorKind(new Error('boom'))).toBe('generic');
    expect(authErrorKind('x')).toBe('generic');
  });
  it('gives each kind a distinct message in both languages', () => {
    for (const locale of ['ro', 'en'] as const) {
      const t = getMessages(locale);
      const kinds = ['notConfigured', 'invalidEmail', 'network', 'notInvited', 'rateLimited', 'generic'] as const;
      expect(new Set(kinds.map((k) => authErrorMessage(k, t))).size).toBe(6);
    }
    expect(authErrorMessage('notConfigured', getMessages('ro'))).toBe('Autentificarea nu este încă disponibilă.');
  });
});

describe('default client', () => {
  it('rejects every call with AuthNotConfiguredError', async () => {
    await expect(notConfiguredAuthClient.signInWithGoogle()).rejects.toBeInstanceOf(AuthNotConfiguredError);
    await expect(notConfiguredAuthClient.sendMagicLink('voi@exemplu.ro')).rejects.toBeInstanceOf(
      AuthNotConfiguredError,
    );
  });
});

describe('dev/test client and previews', () => {
  it('succeeds or fails on demand', async () => {
    await expect(createFakeAuthClient().sendMagicLink('a@b.ro')).resolves.toBeUndefined();
    await expect(createFakeAuthClient('network').sendMagicLink('a@b.ro')).rejects.toBeInstanceOf(AuthNetworkError);
  });
  it('parses preview names', () => {
    expect(parsePreview('sent')).toBe('sent');
    expect(parsePreview('nope')).toBeNull();
    expect(parsePreview(null)).toBeNull();
  });
  it('builds the designed states', () => {
    expect(previewFor('sent').state.status).toBe('sent');
    expect(previewFor('expired').state.status).toBe('expired');
    expect(previewFor('error').state.errorKind).toBe('network');
    expect(previewFor('not-invited').state.errorKind).toBe('notInvited');
    expect(previewFor('rate-limited').state.errorKind).toBe('rateLimited');
    expect(parsePreview('not-invited')).toBe('not-invited');
    expect(parsePreview('rate-limited')).toBe('rate-limited');
  });
});
