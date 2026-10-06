import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { beginAttempt, rememberNext, takeNext } from './authCallback';

describe('next destination across attempts', () => {
  beforeEach(() => {
    const map = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('stores the requested destination and consumes it once', () => {
    beginAttempt('?next=%2Fw%2Fsettings');
    expect(takeNext()).toBe('/w/settings');
    expect(takeNext()).toBe('/w');
  });
  it('a new attempt never inherits a stale destination', () => {
    rememberNext('/w/calculator');
    beginAttempt('');
    expect(takeNext()).toBe('/w');
  });
  it('still validates next', () => {
    beginAttempt('?next=https%3A%2F%2Fevil.com');
    expect(takeNext()).toBe('/w');
  });
});
