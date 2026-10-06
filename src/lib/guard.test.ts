import { describe, expect, it } from 'vitest';
import { guardDecision } from './guard';

describe('guardDecision', () => {
  it('lets everyone through when auth is not configured', () => {
    for (const status of ['disabled', 'unknown', 'signedOut', 'signedIn'] as const) {
      expect(guardDecision({ configured: false, status, path: '/w' })).toEqual({ type: 'allow' });
    }
  });
  it('allows the disabled status even if configured', () => {
    expect(guardDecision({ configured: true, status: 'disabled', path: '/w' })).toEqual({ type: 'allow' });
  });
  it('waits while the session is unknown', () => {
    expect(guardDecision({ configured: true, status: 'unknown', path: '/w' })).toEqual({ type: 'wait' });
  });
  it('sends signed-out visitors to login, keeping the path', () => {
    expect(guardDecision({ configured: true, status: 'signedOut', path: '/w/start?x=1' })).toEqual({
      type: 'redirectToLogin',
      next: '/w/start?x=1',
    });
  });
  it('allows signed-in users', () => {
    expect(guardDecision({ configured: true, status: 'signedIn', path: '/w/settings' })).toEqual({ type: 'allow' });
  });
});
