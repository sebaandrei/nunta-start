/**
 * Toate căile aplicației, într-un singur loc. NS-041 le va muta sub `/w/:weddingId/...`:
 * atunci se schimbă doar acest fișier (și definiția rutelor din router.tsx).
 */
export const paths = {
  landing: '/',
  home: '/w',
  tasks: '/w/start',
  budget: '/w/calculator',
  settings: '/w/settings',
  login: '/login',
  privacy: '/privacy',
  terms: '/terms',
} as const;

/** Căile vechi, redirecționate spre cele noi ca să nu se strice favoritele. */
export const LEGACY_REDIRECTS = [
  { from: '/start', to: paths.tasks },
  { from: '/calculator', to: paths.budget },
  { from: '/settings', to: paths.settings },
] as const;

/**
 * Se schimbă în `true` când ruta /login există (PR-ul de autentificare): butoanele
 * „Începeți" din pagina de start duc atunci la /login, altfel direct în aplicație.
 */
export const SIGN_IN_ROUTE_EXISTS = false;

/** Unde duc butoanele de început din pagina de start. */
export const signUpPath: string = SIGN_IN_ROUTE_EXISTS ? paths.login : paths.home;
