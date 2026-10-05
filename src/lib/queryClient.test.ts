import { describe, expect, it } from 'vitest';
import { ro } from '../i18n/ro';
import { errorToMessage, shouldRetry } from './queryClient';

describe('shouldRetry', () => {
  it('does not retry 4xx', () => {
    expect(shouldRetry(0, { status: 404 })).toBe(false);
    expect(shouldRetry(0, { status: 403 })).toBe(false);
  });
  it('retries 5xx and unknown errors up to twice', () => {
    expect(shouldRetry(0, { status: 500 })).toBe(true);
    expect(shouldRetry(1, new Error('x'))).toBe(true);
    expect(shouldRetry(2, new Error('x'))).toBe(false);
  });
});

describe('errorToMessage', () => {
  it('maps auth, network and unknown errors', () => {
    expect(errorToMessage({ status: 401 })).toBe(ro.errors.forbidden);
    expect(errorToMessage(new TypeError('Failed to fetch'))).toBe(ro.errors.network);
    expect(errorToMessage(new Error('boom'))).toBe(ro.errors.generic);
  });
});
