import { Languages, Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { useT } from '../i18n';
import { LOCALES, type Locale, useLocale } from '../lib/locale';
import { useTheme } from '../lib/theme';
import { Segmented } from './ui';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeSystemDark(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** Tema afișată acum: cea aleasă, iar la „sistem" cea a sistemului. */
function useIsDark(): boolean {
  const mode = useTheme((s) => s.mode);
  const systemDark = useSyncExternalStore(
    subscribeSystemDark,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
  return mode === 'system' ? systemDark : mode === 'dark';
}

/** Luminos / Întunecat, pentru desktop. */
export function ThemeSegmented() {
  const t = useT();
  const setMode = useTheme((s) => s.setMode);
  const dark = useIsDark();
  return (
    <Segmented
      label={t.shell.theme}
      value={dark ? 'dark' : 'light'}
      onChange={setMode}
      options={[
        { value: 'light', label: t.shell.themeLight },
        { value: 'dark', label: t.shell.themeDark },
      ]}
    />
  );
}

/** RO / EN, pentru desktop. */
export function LocaleSegmented() {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  return (
    <Segmented
      label={t.shell.language}
      value={locale}
      onChange={setLocale}
      options={LOCALES.map((value) => ({ value, label: value.toUpperCase() }))}
    />
  );
}

const ICON_BUTTON =
  'inline-flex size-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink';

/** Comută între luminos și întunecat, pentru bara de sus de pe telefon. */
export function ThemeIconButton() {
  const t = useT();
  const setMode = useTheme((s) => s.setMode);
  const dark = useIsDark();
  const Icon = dark ? Sun : Moon;
  const label = dark ? t.shell.toLight : t.shell.toDark;
  return (
    <button
      type="button"
      className={ICON_BUTTON}
      aria-label={label}
      title={label}
      onClick={() => setMode(dark ? 'light' : 'dark')}
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
}

/** Comută limba, pentru bara de sus de pe telefon. */
export function LocaleIconButton() {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  const other: Locale = locale === 'ro' ? 'en' : 'ro';
  const label = t.shell.toLanguage(other.toUpperCase());
  return (
    <button type="button" className={ICON_BUTTON} aria-label={label} title={label} onClick={() => setLocale(other)}>
      <Languages size={20} aria-hidden="true" />
    </button>
  );
}
