import { describe, expect, it } from 'vitest';
import { loginHref, parseCallback, safeNext } from './authCallback';

describe('safeNext', () => {
  it('keeps paths under /w', () => {
    for (const ok of ['/w', '/w/', '/w/start', '/w/calculator?a=1', '/w#x']) expect(safeNext(ok)).toBe(ok);
  });
  it('falls back to /w for everything else', () => {
    for (const bad of [
      null,
      undefined,
      '',
      '/',
      '/login',
      '/workspaces',
      'w/start',
      '//evil.com',
      '/\\evil.com',
      'https://evil.com/w',
      'javascript:alert(1)',
      '/w\n/x',
    ]) {
      expect(safeNext(bad)).toBe('/w');
    }
  });
});

describe('parseCallback', () => {
  it('detects expired links in hash or query', () => {
    expect(parseCallback('', '#error=access_denied&error_code=otp_expired&error_description=x')).toEqual({
      kind: 'expired',
    });
    expect(parseCallback('?error=access_denied&error_code=otp_expired', '')).toEqual({ kind: 'expired' });
  });
  it('treats other errors as generic', () => {
    expect(parseCallback('?error=server_error&error_description=boom', '')).toEqual({ kind: 'error' });
  });
  it('finds the PKCE code and implicit tokens', () => {
    expect(parseCallback('?code=abc', '')).toEqual({ kind: 'code', code: 'abc' });
    expect(parseCallback('', '#access_token=t&refresh_token=r')).toEqual({ kind: 'tokens' });
    expect(parseCallback('', '')).toEqual({ kind: 'none' });
  });
});

describe('loginHref', () => {
  it('encodes next, or flags expiry', () => {
    expect(loginHref('/w/start?a=1')).toBe('/login?next=%2Fw%2Fstart%3Fa%3D1');
    expect(loginHref('', 'expired')).toBe('/login?error=expired');
  });
});
