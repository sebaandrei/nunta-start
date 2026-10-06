import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, storageKeyFor } from './storage/storage';

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  };
}

describe('storageKeyFor', () => {
  it('uses the legacy key only when auth is disabled', () => {
    expect(storageKeyFor('disabled', null)).toBe(STORAGE_KEY);
    expect(storageKeyFor('signedIn', 'a')).toBe(`${STORAGE_KEY}:a`);
    expect(storageKeyFor('signedIn', 'a')).not.toBe(storageKeyFor('signedIn', 'b'));
  });
  it('has no key while the identity is unknown or signed out', () => {
    expect(storageKeyFor('unknown', null)).toBeNull();
    expect(storageKeyFor('signedOut', null)).toBeNull();
    expect(storageKeyFor('signedIn', null)).toBeNull();
  });
});

describe('plan per identity', () => {
  let local: Storage;
  beforeEach(() => {
    vi.resetModules();
    local = fakeStorage();
    vi.stubGlobal('window', { localStorage: local });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('user B never sees user A, sign-out empties memory but keeps A on disk, A gets the plan back', async () => {
    const { useStore, rehydrate } = await import('./store');
    // Fără autentificare configurată, cheia veche e activă: o ocolim și trecem pe conturi.
    rehydrate(storageKeyFor('signedIn', 'a'));
    expect(useStore.getState().data).toBeNull();
    useStore.getState().start({ weddingDate: '2027-09-12', names: ['Ana', 'Mihai'], guests: 100 });
    expect(local.getItem(`${STORAGE_KEY}:a`)).toContain('Ana');

    rehydrate(storageKeyFor('signedOut', null)); // deconectare
    expect(useStore.getState().data).toBeNull();
    expect(local.getItem(`${STORAGE_KEY}:a`)).toContain('Ana'); // golirea memoriei nu șterge discul

    rehydrate(storageKeyFor('signedIn', 'b')); // alt cont în același browser
    expect(useStore.getState().data).toBeNull();
    expect(local.getItem(`${STORAGE_KEY}:b`)).toBeNull();
    expect(local.getItem(STORAGE_KEY)).toBeNull();

    rehydrate(storageKeyFor('signedIn', 'a'));
    expect(useStore.getState().data?.settings.names).toEqual(['Ana', 'Mihai']);
  });

  it('does not adopt the legacy key for a signed-in user', async () => {
    const { useStore, rehydrate } = await import('./store');
    rehydrate(storageKeyFor('disabled', null));
    useStore.getState().start({ weddingDate: '2027-09-12', names: ['Vechi', 'Plan'], guests: 50 });
    expect(local.getItem(STORAGE_KEY)).toContain('Vechi');
    rehydrate(storageKeyFor('signedIn', 'c'));
    expect(useStore.getState().data).toBeNull();
  });
});
