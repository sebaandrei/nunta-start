import { useNavigate } from '@tanstack/react-router';
import { Languages, LogOut, Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { useT } from '../i18n';
import { LOCALES, type Locale, useLocale } from '../lib/locale';
import { paths } from '../lib/paths';
import { signOut, useSession } from '../lib/session';
import { useTheme } from '../lib/theme';
import { Button, IconButton, Segmented } from './ui';

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

/** Comută între luminos și întunecat, pentru bara de sus de pe telefon. */
export function ThemeIconButton() {
  const t = useT();
  const setMode = useTheme((s) => s.setMode);
  const dark = useIsDark();
  const Icon = dark ? Sun : Moon;
  const label = dark ? t.shell.toLight : t.shell.toDark;
  return (
    <IconButton label={label} onClick={() => setMode(dark ? 'light' : 'dark')}>
      <Icon size={20} aria-hidden="true" />
    </IconButton>
  );
}

/** Deconectarea: doar când autentificarea e activă și omul e conectat. Mergem întâi acasă, apoi închidem sesiunea. */
function useSignOut(): (() => void) | null {
  const signedIn = useSession((s) => s.status === 'signedIn');
  const navigate = useNavigate();
  if (!signedIn) return null;
  return () => {
    void navigate({ to: paths.landing }).then(() => signOut());
  };
}

/** Deconectare în meniul lateral, lângă cardul cuplului. */
export function SignOutButton() {
  const t = useT();
  const onSignOut = useSignOut();
  if (!onSignOut) return null;
  return (
    <Button variant="ghost" className="mt-3 w-full justify-start gap-2" onClick={onSignOut}>
      <LogOut size={16} aria-hidden="true" />
      {t.shell.signOut}
    </Button>
  );
}

/** Deconectare în bara de sus de pe telefon. */
export function SignOutIconButton() {
  const t = useT();
  const onSignOut = useSignOut();
  if (!onSignOut) return null;
  return (
    <IconButton label={t.shell.signOut} onClick={onSignOut}>
      <LogOut size={20} aria-hidden="true" />
    </IconButton>
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
    <IconButton label={label} onClick={() => setLocale(other)}>
      <Languages size={20} aria-hidden="true" />
    </IconButton>
  );
}
