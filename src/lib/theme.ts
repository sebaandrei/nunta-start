import { create } from 'zustand';

export const THEME_KEY = 'nunta-start:theme';
export const THEME_MODES = ['system', 'light', 'dark'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/** Orice valoare necunoscută (lipsă, coruptă, din altă versiune) cade pe „system". */
export function parseThemeMode(raw: unknown): ThemeMode {
  return THEME_MODES.find((m) => m === raw) ?? 'system';
}

/** Valoarea lui data-theme; null înseamnă „fără atribut", adică tema sistemului. */
export function themeAttribute(mode: ThemeMode): 'light' | 'dark' | null {
  return mode === 'system' ? null : mode;
}

/** Elementul rădăcină, injectat ca să nu depindem de DOM în teste. */
export interface ThemeRoot {
  dataset: Record<string, string | undefined>;
  style: { colorScheme: string };
}

export function applyTheme(mode: ThemeMode, root: ThemeRoot): void {
  const attr = themeAttribute(mode);
  if (attr) root.dataset.theme = attr;
  else delete root.dataset.theme;
  // „system": fără valoare explicită, color-scheme vine din CSS (care urmărește sistemul).
  root.style.colorScheme = attr ?? '';
}

function readStored(): ThemeMode {
  try {
    return parseThemeMode(localStorage.getItem(THEME_KEY));
  } catch {
    return 'system';
  }
}

function writeStored(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    // Fără stocare, tema merge doar pe sesiunea curentă.
  }
}

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const hasDocument = typeof document !== 'undefined';

export const useTheme = create<ThemeState>((set) => ({
  mode: hasDocument ? readStored() : 'system',
  setMode: (raw) => {
    const mode = parseThemeMode(raw);
    writeStored(mode);
    if (hasDocument) applyTheme(mode, document.documentElement);
    set({ mode });
  },
}));

if (hasDocument) applyTheme(useTheme.getState().mode, document.documentElement);
