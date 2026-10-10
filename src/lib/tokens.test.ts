/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  const body = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
}

const themes = {
  light: block(':root'),
  dark: block(':root[data-theme="dark"]'),
};

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe.each(Object.entries(themes))('contrastul în tema %s', (name, t) => {
  it('definește toate tokenurile', () => {
    for (const k of [
      'bg',
      'surface',
      'sunken',
      'line',
      'ink',
      'muted',
      'faint',
      'accent',
      'accent-solid',
      'on-accent',
      'plus',
      'minus',
      'hero',
      'soft',
      'warm',
    ]) {
      expect(t[k], k).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('textul de corp are cel puțin 4.5:1', () => {
    for (const fg of ['ink', 'muted', 'accent', 'plus', 'minus']) {
      for (const bg of ['bg', 'surface']) {
        expect(contrast(t[fg], t[bg]), `${fg} pe ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    for (const fg of ['ink', 'muted']) {
      for (const bg of ['sunken', 'hero', 'soft', 'warm']) {
        expect(contrast(t[fg], t[bg]), `${fg} pe ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(contrast(t['on-accent'], t['accent-solid']), 'on-accent pe accent-solid').toBeGreaterThanOrEqual(4.5);
  });

  it('raportează contrastul tuturor perechilor', () => {
    const rows: string[] = [];
    for (const fg of ['ink', 'muted', 'faint', 'accent', 'plus', 'minus']) {
      for (const bg of ['bg', 'surface', 'sunken', 'hero', 'soft', 'warm']) {
        rows.push(`${fg}/${bg}=${contrast(t[fg], t[bg]).toFixed(2)}`);
      }
    }
    rows.push(`on-accent/accent-solid=${contrast(t['on-accent'], t['accent-solid']).toFixed(2)}`);
    console.log(`${name}: ${rows.join(' ')}`);
    expect(rows.length).toBeGreaterThan(0);
  });
});
