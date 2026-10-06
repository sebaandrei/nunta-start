import { describe, expect, it } from 'vitest';
import {
  invitePath,
  isWeddingId,
  LEGACY_REDIRECTS,
  paths,
  routes,
  signUpPath,
  UNSCOPED_PATHS,
  weddingPath,
} from './paths';

const ID = '3f2b8a4e-1c5d-4e6f-8a9b-0c1d2e3f4a5b';

describe('paths', () => {
  it('pune toate ecranele unei nunți sub /w/$weddingId', () => {
    for (const p of Object.values(routes)) expect(p.startsWith('/w/$weddingId')).toBe(true);
  });

  it('nu are două căi identice', () => {
    const all = [...Object.values(paths), ...Object.values(routes), ...Object.values(UNSCOPED_PATHS)];
    expect(new Set(all).size).toBe(all.length);
  });

  it('construiește adresa unui ecran, cu id codat', () => {
    expect(weddingPath(ID)).toBe(`/w/${ID}`);
    expect(weddingPath(ID, 'tasks')).toBe(`/w/${ID}/start`);
    expect(weddingPath(ID, 'budget')).toBe(`/w/${ID}/calculator`);
    expect(weddingPath(ID, 'settings')).toBe(`/w/${ID}/settings`);
    expect(weddingPath('a b/c')).toBe('/w/a%20b%2Fc');
  });

  it('redirecționează căile vechi spre cele fără id', () => {
    expect(LEGACY_REDIRECTS.map((r) => [r.from, r.to])).toEqual([
      ['/start', '/w/start'],
      ['/calculator', '/w/calculator'],
      ['/settings', '/w/settings'],
    ]);
  });

  it('recunoaște un id de nuntă', () => {
    expect(isWeddingId(ID)).toBe(true);
    expect(isWeddingId(ID.toUpperCase())).toBe(true);
    for (const bad of ['start', 'new', '', `${ID}x`, '123']) expect(isWeddingId(bad)).toBe(false);
  });

  it('codează tokenul invitației', () => {
    expect(invitePath('a b/c')).toBe('/invite/a%20b%2Fc');
  });

  it('butoanele de început duc la /login', () => {
    expect(signUpPath).toBe(paths.login);
  });
});
