import { describe, expect, it } from 'vitest';
import { initialSignInState, RESEND_SECONDS, type SignInEvent, type SignInState, signInReducer } from './signInState';

const run = (events: SignInEvent[], from: SignInState = initialSignInState()) => events.reduce(signInReducer, from);
const typed = (email: string): SignInEvent => ({ type: 'edit', email });

describe('signInReducer', () => {
  it('starts idle or expired', () => {
    expect(initialSignInState().status).toBe('idle');
    expect(initialSignInState('expired').status).toBe('expired');
  });

  it('refuses an empty or invalid email with a field error and stays put', () => {
    const empty = run([{ type: 'submit' }]);
    expect(empty).toMatchObject({ status: 'idle', fieldError: 'empty' });
    const bad = run([typed('voi@'), { type: 'submit' }]);
    expect(bad).toMatchObject({ status: 'idle', fieldError: 'invalid' });
  });

  it('clears the field error while editing', () => {
    expect(run([{ type: 'submit' }, typed('v')]).fieldError).toBeNull();
  });

  it('sends a valid email, then reaches sent with the full countdown', () => {
    const sending = run([typed('voi@exemplu.ro'), { type: 'submit' }]);
    expect(sending.status).toBe('sending');
    const sent = run([{ type: 'succeeded' }], sending);
    expect(sent).toMatchObject({ status: 'sent', email: 'voi@exemplu.ro', resendIn: RESEND_SECONDS });
  });

  it('ignores edits and a second submit while sending', () => {
    const sending = run([typed('voi@exemplu.ro'), { type: 'submit' }]);
    expect(run([typed('x@y.ro'), { type: 'submit' }], sending)).toEqual(sending);
  });

  it('moves to error on failure and allows retrying', () => {
    const failed = run([typed('voi@exemplu.ro'), { type: 'submit' }, { type: 'failed', kind: 'notConfigured' }]);
    expect(failed).toMatchObject({ status: 'error', errorKind: 'notConfigured' });
    expect(run([{ type: 'submit' }], failed).status).toBe('sending');
    expect(run([{ type: 'submit' }], failed).errorKind).toBeNull();
  });

  it('Google goes to sending without needing an email, and can fail', () => {
    const failed = run([{ type: 'google' }, { type: 'failed', kind: 'notConfigured' }]);
    expect(failed).toMatchObject({ status: 'error', errorKind: 'notConfigured' });
  });

  it('counts down only in sent and never below zero', () => {
    const sent = run([typed('a@b.ro'), { type: 'submit' }, { type: 'succeeded' }]);
    expect(run([{ type: 'tick' }], sent).resendIn).toBe(RESEND_SECONDS - 1);
    const done = run(
      Array.from({ length: RESEND_SECONDS + 5 }, () => ({ type: 'tick' }) as const),
      sent,
    );
    expect(done.resendIn).toBe(0);
    expect(run([{ type: 'tick' }]).resendIn).toBe(0);
  });

  it('resend works only after the countdown ends', () => {
    const sent = run([typed('a@b.ro'), { type: 'submit' }, { type: 'succeeded' }]);
    expect(run([{ type: 'resend' }], sent)).toEqual(sent);
    const ready = { ...sent, resendIn: 0 };
    expect(run([{ type: 'resend' }], ready).status).toBe('sending');
    expect(run([{ type: 'resend' }, { type: 'succeeded' }], ready).resendIn).toBe(RESEND_SECONDS);
    expect(run([{ type: 'resend' }, { type: 'failed', kind: 'network' }], ready).status).toBe('error');
  });

  it('"use another address" returns to a blank idle form', () => {
    const sent = run([typed('a@b.ro'), { type: 'submit' }, { type: 'succeeded' }, { type: 'useOther' }]);
    expect(sent).toEqual(initialSignInState());
  });

  it('expired requests a new link like idle does', () => {
    const s = run([typed('a@b.ro'), { type: 'submit' }], initialSignInState('expired'));
    expect(s.status).toBe('sending');
  });

  it('ignores results that arrive outside sending', () => {
    expect(run([{ type: 'succeeded' }]).status).toBe('idle');
    expect(run([{ type: 'failed', kind: 'network' }]).status).toBe('idle');
  });
});
