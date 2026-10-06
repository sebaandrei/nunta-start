import { describe, expect, it } from 'vitest';
import { LEGACY_REDIRECTS, paths, signUpPath } from './paths';

describe('paths', () => {
  it('pune ecranele aplicației sub /w', () => {
    for (const p of [paths.home, paths.tasks, paths.budget, paths.settings]) {
      expect(p === '/w' || p.startsWith('/w/')).toBe(true);
    }
  });

  it('nu are două căi identice', () => {
    const all = Object.values(paths);
    expect(new Set(all).size).toBe(all.length);
  });

  it('redirecționează căile vechi spre ecranele noi', () => {
    expect(LEGACY_REDIRECTS.map((r) => [r.from, r.to])).toEqual([
      ['/start', '/w/start'],
      ['/calculator', '/w/calculator'],
      ['/settings', '/w/settings'],
    ]);
  });

  it('butoanele de început duc la /login', () => {
    expect(signUpPath).toBe(paths.login);
  });
});
