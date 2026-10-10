import { createRootRoute, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router';
import { App } from './App';
import { PendingPage } from './components/skeletons';
import { Toaster } from './components/Toaster';
import {
  budgetLinesQuery,
  budgetScenariosQuery,
  budgetSettingsQuery,
  collectionFieldsQuery,
  collectionRecordsQuery,
  collectionsQuery,
  guestsQuery,
  householdsQuery,
  tasksQuery,
  weddingQuery,
  weddingsQuery,
} from './data/queries';
import { isAuthConfigured, notConfiguredAuthClient } from './lib/auth';
import { loginHref } from './lib/authCallback';
import { supabaseAuthClient } from './lib/authSupabase';
import { guardDecision } from './lib/guard';
import { isWeddingId, LEGACY_REDIRECTS, paths, UNSCOPED_PATHS, type WeddingSection, weddingPath } from './lib/paths';
import { queryClient } from './lib/queryClient';
import { initSession, useSession } from './lib/session';
import { AuthCallback } from './screens/AuthCallback';
import { Calculator } from './screens/Calculator';
import { CollectionPage } from './screens/CollectionPage';
import { NotFound, RouteError } from './screens/ErrorPages';
import { Guests } from './screens/Guests';
import { Home } from './screens/Home';
import { InviteRoute } from './screens/InviteAccept';
import { Landing } from './screens/Landing';
import { LegalPage } from './screens/LegalPage';
import { Onboarding } from './screens/Onboarding';
import { Pages } from './screens/Pages';
import { RsvpRoute } from './screens/Rsvp';
import { Settings } from './screens/Settings';
import { SignIn } from './screens/SignIn';
import { Start } from './screens/Start';
import { Workspaces } from './screens/Workspaces';

const rootRoute = createRootRoute({ component: Outlet, errorComponent: RouteError, notFoundComponent: NotFound });

// Pagina publică, fără meniul aplicației.
const landingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Landing });

// Zona autentificată de sub /w: orice cale cere o sesiune (cu autentificarea configurată).
// Aici stau alegerea nunții, crearea ei și, sub /w/$weddingId, ecranele unei nunți.
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/w',
  component: AppLayout,
  beforeLoad: async ({ location }) => {
    const configured = isAuthConfigured();
    if (configured) await initSession();
    const decision = guardDecision({ configured, status: useSession.getState().status, path: location.href });
    if (decision.type === 'redirectToLogin') throw redirect({ href: loginHref(decision.next), replace: true });
  },
});

function AppLayout() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}

// /w: alegerea nunții. Cu o singură nuntă duce direct în ea, fără niciuna la crearea ei;
// `?all` arată lista oricum (meniul „Schimbați nunta").
const pickerRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  component: () => <Workspaces />,
  validateSearch: (search: Record<string, unknown>): { all?: boolean } => (search.all ? { all: true } : {}),
  beforeLoad: async ({ search }) => {
    if (search.all) return;
    const list = await queryClient.fetchQuery(weddingsQuery());
    if (list.length === 0) throw redirect({ to: paths.newWedding, replace: true });
    if (list.length === 1) throw redirect({ href: weddingPath(list[0].id), replace: true });
  },
});

const newWeddingRoute = createRoute({ getParentRoute: () => appRoute, path: '/new', component: Onboarding });

// Căile fără id (favorite vechi): duc în nunta omului, sau la alegere dacă are mai multe sau niciuna.
const unscopedRoutes = (Object.keys(UNSCOPED_PATHS) as Exclude<WeddingSection, 'home'>[]).map((section) =>
  createRoute({
    getParentRoute: () => appRoute,
    path: UNSCOPED_PATHS[section].slice('/w'.length),
    beforeLoad: async () => {
      const list = await queryClient.fetchQuery(weddingsQuery());
      if (list.length === 1) throw redirect({ href: weddingPath(list[0].id, section), replace: true });
      throw redirect({ to: paths.workspaces, replace: true });
    },
  }),
);

// /w/$weddingId: meniul și ecranele unei nunți. Loader-ul pune datele în cache înainte de afișare;
// o nuntă la care nu am acces (sau un id invalid) o tratează `WeddingProvider`.
const weddingRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/$weddingId',
  component: App,
  loader: async ({ params: { weddingId } }) => {
    if (!isWeddingId(weddingId)) return;
    const wedding = await queryClient.fetchQuery(weddingQuery(weddingId));
    if (!wedding) return;
    await Promise.all([
      queryClient.ensureQueryData(tasksQuery(weddingId)),
      queryClient.ensureQueryData(budgetSettingsQuery(weddingId)),
      queryClient.ensureQueryData(budgetScenariosQuery(weddingId)),
      queryClient.ensureQueryData(budgetLinesQuery(weddingId)),
      queryClient.ensureQueryData(householdsQuery(weddingId)),
      queryClient.ensureQueryData(guestsQuery(weddingId)),
      queryClient.ensureQueryData(collectionsQuery(weddingId)),
      queryClient.ensureQueryData(collectionFieldsQuery(weddingId)),
      queryClient.ensureQueryData(collectionRecordsQuery(weddingId)),
    ]);
  },
});

const weddingChildren = [
  createRoute({ getParentRoute: () => weddingRoute, path: '/', component: Home }),
  // `?add`: venit din „Adaugă un task" de pe Acasă; ecranul deschide imediat un task nou.
  createRoute({
    getParentRoute: () => weddingRoute,
    path: '/start',
    component: Start,
    validateSearch: (search: Record<string, unknown>): { add?: boolean } => (search.add ? { add: true } : {}),
  }),
  createRoute({ getParentRoute: () => weddingRoute, path: '/calculator', component: Calculator }),
  createRoute({ getParentRoute: () => weddingRoute, path: '/guests', component: Guests }),
  createRoute({ getParentRoute: () => weddingRoute, path: '/pages', component: Pages }),
  createRoute({ getParentRoute: () => weddingRoute, path: '/pages/$slug', component: CollectionPage }),
  createRoute({ getParentRoute: () => weddingRoute, path: '/settings', component: Settings }),
];

// Autentificarea: ecran public complet, în afara aplicației (fără meniu, fără Onboarding).
const authClient = isAuthConfigured() ? supabaseAuthClient : notConfiguredAuthClient;
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: paths.login,
  component: () => <SignIn client={authClient} />,
  beforeLoad: async () => {
    if (!isAuthConfigured()) return;
    await initSession();
    if (useSession.getState().status === 'signedIn') throw redirect({ to: paths.workspaces, replace: true });
  },
});
const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: paths.authCallback,
  component: AuthCallback,
});

// Pagini juridice publice (proiecte, noindex).
const legalRoutes = [
  createRoute({ getParentRoute: () => rootRoute, path: paths.privacy, component: () => <LegalPage doc="privacy" /> }),
  createRoute({ getParentRoute: () => rootRoute, path: paths.terms, component: () => <LegalPage doc="terms" /> }),
];

// Invitațiile: ecran public, fără meniu. Vechiul /workspaces duce la alegerea nunții.
const workspacesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: paths.legacyWorkspaces,
  beforeLoad: () => {
    throw redirect({ to: paths.workspaces, replace: true });
  },
});
const inviteRoute = createRoute({ getParentRoute: () => rootRoute, path: paths.invite, component: InviteRoute });

// Confirmarea de participare: pagină publică, fără cont (tokenul din adresă e singura "cheie").
const rsvpRoute = createRoute({ getParentRoute: () => rootRoute, path: paths.rsvp, component: RsvpRoute });

const legacyRoutes = LEGACY_REDIRECTS.map(({ from, to }) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: from,
    beforeLoad: () => {
      throw redirect({ href: to, replace: true });
    },
  }),
);

const routeTree = rootRoute.addChildren([
  landingRoute,
  appRoute.addChildren([pickerRoute, newWeddingRoute, ...unscopedRoutes, weddingRoute.addChildren(weddingChildren)]),
  loginRoute,
  authCallbackRoute,
  workspacesRoute,
  inviteRoute,
  rsvpRoute,
  ...legalRoutes,
  ...legacyRoutes,
]);

export const router = createRouter({ routeTree, scrollRestoration: true, defaultPendingComponent: PendingPage });

// Sesiunea s-a pierdut cât timp omul era în aplicație (expirare, alt tab): înapoi la conectare.
useSession.subscribe((state) => {
  if (state.status === 'signedOut' && router.state.location.pathname.startsWith('/w')) {
    router.history.replace(loginHref(router.state.location.href));
  }
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
