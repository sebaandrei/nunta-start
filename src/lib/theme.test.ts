import { describe, expect, it } from 'vitest';
import { applyTheme, parseThemeMode, type ThemeRoot, themeAttribute } from './theme';

describe('parseThemeMode', () => {
  it('acceptă cele trei moduri', () => {
    expect(parseThemeMode('system')).toBe('system');
    expect(parseThemeMode('light')).toBe('light');
    expect(parseThemeMode('dark')).toBe('dark');
  });

  it('valorile necunoscute devin system', () => {
    for (const raw of [null, undefined, '', 'Dark', 'auto', 1, {}]) {
      expect(parseThemeMode(raw)).toBe('system');
    }
  });
});

describe('themeAttribute', () => {
  it('system nu are atribut', () => {
    expect(themeAttribute('system')).toBeNull();
    expect(themeAttribute('light')).toBe('light');
    expect(themeAttribute('dark')).toBe('dark');
  });
});

describe('applyTheme', () => {
  const root = (): ThemeRoot => ({ dataset: {}, style: { colorScheme: '' } });

  it('pune atributul și color-scheme pentru moduri explicite', () => {
    const r = root();
    applyTheme('dark', r);
    expect(r.dataset.theme).toBe('dark');
    expect(r.style.colorScheme).toBe('dark');
  });

  it('scoate atributul pentru system', () => {
    const r = root();
    applyTheme('light', r);
    applyTheme('system', r);
    expect(r.dataset.theme).toBeUndefined();
    expect(r.style.colorScheme).toBe('');
  });
});
