import { describe, expect, it } from 'vitest';
import { initialSignInState, RESEND_SECONDS, type SignInEvent, type SignInState, signInReducer } from './signInState';

const run = (events: SignInEvent[], from: SignInState = initialSignInState()) => events.reduce(signInReducer, from);
const typed = (email: string): SignInEvent => ({ type: 'edit', email });
const submit = (id = 1): SignInEvent => ({ type: 'submit', id });
const ok = (id = 1): SignInEvent => ({ type: 'succeeded', id });
const fail = (kind: 'notConfigured' | 'network', id = 1): SignInEvent => ({ type: 'failed', id, kind });
const sentState = () => run([typed('a@b.ro'), submit(), ok()]);

describe('signInReducer', () => {
  it('starts idle or expired', () => {
    expect(initialSignInState().status).toBe('idle');
    expect(initialSignInState('expired').status).toBe('expired');
  });

  it('refuses an empty or invalid email with a field error and stays put', () => {
    expect(run([submit()])).toMatchObject({ status: 'idle', fieldError: 'empty' });
    expect(run([typed('voi@'), submit()])).toMatchObject({ status: 'idle', fieldError: 'invalid' });
  });

  it('clears the field error while editing', () => {
    expect(run([submit(), typed('v')]).fieldError).toBeNull();
  });

  it('sends a valid email, then reaches sent with the full countdown', () => {
    const sending = run([typed('voi@exemplu.ro'), submit()]);
    expect(sending.status).toBe('sending');
    expect(run([ok()], sending)).toMatchObject({ status: 'sent', email: 'voi@exemplu.ro', resendIn: RESEND_SECONDS });
  });

  it('ignores edits and a second submit while sending', () => {
    const sending = run([typed('voi@exemplu.ro'), submit()]);
    expect(run([typed('x@y.ro'), submit(2)], sending)).toEqual(sending);
  });

  it('moves to error on failure and allows retrying', () => {
    const failed = run([typed('voi@exemplu.ro'), submit(), fail('notConfigured')]);
    expect(failed).toMatchObject({ status: 'error', errorKind: 'notConfigured' });
    expect(run([submit(2)], failed).status).toBe('sending');
    expect(run([submit(2)], failed).errorKind).toBeNull();
  });

  it('Google goes to sending without needing an email, and can fail', () => {
    const failed = run([{ type: 'google', id: 1 }, fail('notConfigured')]);
    expect(failed).toMatchObject({ status: 'error', errorKind: 'notConfigured' });
  });

  it('counts down only in sent and never below zero', () => {
    const sent = sentState();
    expect(run([{ type: 'tick' }], sent).resendIn).toBe(RESEND_SECONDS - 1);
    const ticks = Array.from({ length: RESEND_SECONDS + 5 }, () => ({ type: 'tick' }) as const);
    expect(run(ticks, sent).resendIn).toBe(0);
    expect(run([{ type: 'tick' }]).resendIn).toBe(0);
  });

  it('resend works only after the countdown ends', () => {
    const sent = sentState();
    expect(run([{ type: 'resend', id: 2 }], sent)).toEqual(sent);
    const ready = { ...sent, resendIn: 0 };
    expect(run([{ type: 'resend', id: 2 }], ready)).toMatchObject({ status: 'sending', resending: true });
    expect(run([{ type: 'resend', id: 2 }, ok(2)], ready).resendIn).toBe(RESEND_SECONDS);
    expect(run([{ type: 'resend', id: 2 }, fail('network', 2)], ready).status).toBe('error');
  });

  it('"use another address" returns to a blank idle form', () => {
    expect(run([typed('a@b.ro'), submit(), ok(), { type: 'useOther' }])).toEqual(initialSignInState());
  });

  it('expired requests a new link like idle does', () => {
    expect(run([typed('a@b.ro'), submit()], initialSignInState('expired')).status).toBe('sending');
  });

  it('ignores results that arrive outside sending', () => {
    expect(run([ok()]).status).toBe('idle');
    expect(run([fail('network')]).status).toBe('idle');
  });
});

describe('stale completions', () => {
  const ready = () => ({ ...sentState(), resendIn: 0 });

  it('ignores an old resend result after reset and a new submit', () => {
    // Resend #2 in flight, user resets, submits another address (#3).
    const inFlight = run([{ type: 'resend', id: 2 }, { type: 'useOther' }, typed('c@d.ro'), submit(3)], ready());
    expect(inFlight).toMatchObject({ status: 'sending', requestId: 3, email: 'c@d.ro' });
    expect(run([ok(2)], inFlight)).toEqual(inFlight);
    expect(run([fail('network', 2)], inFlight)).toEqual(inFlight);
  });

  it('applies the matching result of the new request', () => {
    const inFlight = run([{ type: 'resend', id: 2 }, { type: 'useOther' }, typed('c@d.ro'), submit(3)], ready());
    expect(run([ok(3)], inFlight)).toMatchObject({ status: 'sent', email: 'c@d.ro', resendIn: RESEND_SECONDS });
    expect(run([fail('network', 3)], inFlight)).toMatchObject({ status: 'error', errorKind: 'network' });
  });

  it('ignores a late result once the form was reset to idle', () => {
    const reset = run([typed('a@b.ro'), submit(1), { type: 'useOther' }]);
    expect(run([ok(1)], reset)).toEqual(reset);
  });

  it('ties Google completions to their request', () => {
    const s = run([{ type: 'google', id: 5 }]);
    expect(run([fail('notConfigured', 4)], s)).toEqual(s);
    expect(run([fail('notConfigured', 5)], s).status).toBe('error');
  });
});
