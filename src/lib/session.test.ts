import { describe, expect, it } from 'vitest';
import { initialSessionState, stateFromSession } from './session';

describe('session mapping', () => {
  it('is disabled without configuration and unknown with it', () => {
    expect(initialSessionState(false)).toEqual({ status: 'disabled', user: null });
    expect(initialSessionState(true)).toEqual({ status: 'unknown', user: null });
  });
  it('maps a session to signedIn with a trimmed user', () => {
    expect(stateFromSession({ user: { id: 'u1', email: 'a@b.ro' } })).toEqual({
      status: 'signedIn',
      user: { id: 'u1', email: 'a@b.ro' },
    });
    expect(stateFromSession({ user: { id: 'u2' } }).user).toEqual({ id: 'u2', email: null });
  });
  it('maps no session to signedOut', () => {
    expect(stateFromSession(null)).toEqual({ status: 'signedOut', user: null });
    expect(stateFromSession(undefined).status).toBe('signedOut');
  });
});
