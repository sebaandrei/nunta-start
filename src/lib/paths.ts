/**
 * Toate căile aplicației, într-un singur loc. Ecranele unei nunți stau sub `/w/:weddingId/...`:
 * tiparele (`routes`) se dau lui `<Link to params>` și definiției rutelor, iar `weddingPath` dă
 * adresa concretă pentru `href`, `navigate` sau redirecționări.
 */
export const paths = {
  landing: '/',
  login: '/login',
  authCallback: '/auth/callback',
  /** Alegerea nunții (și, pentru cine are una singură, redirecționarea în ea). */
  workspaces: '/w',
  /** Ecranul de creare a unei nunți (Onboarding). */
  newWedding: '/w/new',
  /** Adresa veche a alegerii spațiului; duce la `workspaces`. */
  legacyWorkspaces: '/workspaces',
  invite: '/invite/$token',
  privacy: '/privacy',
  terms: '/terms',
} as const;

/** Tiparele ecranelor unei nunți. */
export const routes = {
  home: '/w/$weddingId',
  tasks: '/w/$weddingId/start',
  budget: '/w/$weddingId/calculator',
  settings: '/w/$weddingId/settings',
} as const;

export type WeddingSection = keyof typeof routes;

/** Adresa unui ecran al unei nunți. */
export function weddingPath(weddingId: string, section: WeddingSection = 'home'): string {
  return routes[section].replace('$weddingId', encodeURIComponent(weddingId));
}

/** Adresa unei invitații, cu tokenul codat. */
export const invitePath = (token: string) => `/invite/${encodeURIComponent(token)}`;

/** Căile fără id de nuntă (favorite vechi): duc în nunta omului sau la alegere. */
export const UNSCOPED_PATHS = {
  tasks: '/w/start',
  budget: '/w/calculator',
  settings: '/w/settings',
} as const satisfies Record<Exclude<WeddingSection, 'home'>, string>;

/** Căile de dinainte de /w, redirecționate spre cele fără id (care, la rândul lor, găsesc nunta). */
export const LEGACY_REDIRECTS = [
  { from: '/start', to: UNSCOPED_PATHS.tasks },
  { from: '/calculator', to: UNSCOPED_PATHS.budget },
  { from: '/settings', to: UNSCOPED_PATHS.settings },
] as const;

/** Un id de nuntă e UUID; orice altceva nu se mai trimite la server (ar fi eroare 400). */
export function isWeddingId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Se schimbă în `true` când ruta /login există (PR-ul de autentificare): butoanele
 * „Începeți" din pagina de start duc atunci la /login, altfel direct în aplicație.
 */
export const SIGN_IN_ROUTE_EXISTS = true;

/** Unde duc butoanele de început din pagina de start. */
export const signUpPath: string = SIGN_IN_ROUTE_EXISTS ? paths.login : paths.workspaces;
