import { create } from 'zustand';

export const LOCALE_KEY = 'nunta-start:locale';
export const LOCALES = ['ro', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ro';

/** Orice valoare necunoscută (lipsă, coruptă, din altă versiune) cade pe română. */
export function parseLocale(raw: unknown): Locale {
  return LOCALES.find((l) => l === raw) ?? DEFAULT_LOCALE;
}

/** Elementul rădăcină, injectat ca să nu depindem de DOM în teste. */
export function applyLocale(locale: Locale, root: { lang: string }): void {
  root.lang = locale;
}

function readStored(): Locale {
  try {
    return parseLocale(localStorage.getItem(LOCALE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

function writeStored(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // Fără stocare, limba merge doar pe sesiunea curentă.
  }
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const hasDocument = typeof document !== 'undefined';

export const useLocale = create<LocaleState>((set) => ({
  locale: hasDocument ? readStored() : DEFAULT_LOCALE,
  setLocale: (raw) => {
    const locale = parseLocale(raw);
    writeStored(locale);
    if (hasDocument) applyLocale(locale, document.documentElement);
    set({ locale });
  },
}));

if (hasDocument) applyLocale(useLocale.getState().locale, document.documentElement);

/** Limba curentă, pentru cod care nu e componentă (formatare). */
export function currentLocale(): Locale {
  return useLocale.getState().locale;
}
