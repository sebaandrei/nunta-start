import { describe, expect, it } from 'vitest';
import { redactDeep, redactSecrets } from './redact';

describe('redactSecrets', () => {
  it('hides the invite token', () => {
    expect(redactSecrets('https://x.ro/invite/abc123_-XYZ?preview=1')).toBe('https://x.ro/invite/[redacted]?preview=1');
  });

  it('hides auth params in query and hash', () => {
    expect(redactSecrets('/auth/callback?code=abc&next=/w')).toBe('/auth/callback?code=[redacted]&next=/w');
    expect(redactSecrets('/auth/callback#access_token=a.b.c&refresh_token=r&type=magiclink')).toBe(
      '/auth/callback#access_token=[redacted]&refresh_token=[redacted]&type=magiclink',
    );
  });

  it('leaves ordinary urls alone', () => {
    expect(redactSecrets('/w/123/calculator?tab=1')).toBe('/w/123/calculator?tab=1');
  });
});

describe('redactDeep', () => {
  it('cleans nested strings without touching the shape', () => {
    const item = {
      meta: { page: { url: 'https://x.ro/invite/secret' } },
      payload: { n: 1, list: ['/auth/callback?code=c'] },
    };
    expect(redactDeep(item)).toEqual({
      meta: { page: { url: 'https://x.ro/invite/[redacted]' } },
      payload: { n: 1, list: ['/auth/callback?code=[redacted]'] },
    });
  });
});
