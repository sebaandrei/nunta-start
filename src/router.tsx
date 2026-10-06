import { createRootRoute, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router';
import { App } from './App';
import { PendingPage } from './components/skeletons';
import { isAuthConfigured, notConfiguredAuthClient } from './lib/auth';
import { loginHref } from './lib/authCallback';
import { supabaseAuthClient } from './lib/authSupabase';
import { guardDecision } from './lib/guard';
import { LEGACY_REDIRECTS, paths } from './lib/paths';
import { initSession, useSession } from './lib/session';
import { AuthCallback } from './screens/AuthCallback';
import { Calculator } from './screens/Calculator';
import { NotFound, RouteError } from './screens/ErrorPages';
import { Home } from './screens/Home';
import { InviteRoute } from './screens/InviteAccept';
import { Landing } from './screens/Landing';
import { LegalPage } from './screens/LegalPage';
import { Settings } from './screens/Settings';
import { SignIn } from './screens/SignIn';
import { Start } from './screens/Start';
import { Workspaces } from './screens/Workspaces';

const rootRoute = createRootRoute({ component: Outlet, errorComponent: RouteError, notFoundComponent: NotFound });

// Pagina publică, fără meniul aplicației.
const landingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Landing });

// Aplicația: meniul (sau Onboarding, când nu sunt date) învelește ecranele de sub /w.
// Cu autentificarea configurată, orice cale de sub /w cere o sesiune; fără ea nimic nu se schimbă.
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/w',
  component: App,
  beforeLoad: async ({ location }) => {
    const configured = isAuthConfigured();
    if (configured) await initSession();
    const decision = guardDecision({ configured, status: useSession.getState().status, path: location.href });
    if (decision.type === 'redirectToLogin') throw redirect({ href: loginHref(decision.next), replace: true });
  },
});

const appChildren = [
  createRoute({ getParentRoute: () => appRoute, path: '/', component: Home }),
  createRoute({ getParentRoute: () => appRoute, path: '/start', component: Start }),
  createRoute({ getParentRoute: () => appRoute, path: '/calculator', component: Calculator }),
  createRoute({ getParentRoute: () => appRoute, path: '/settings', component: Settings }),
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
    if (useSession.getState().status === 'signedIn') throw redirect({ to: paths.home, replace: true });
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

// Alegerea spațiului și invitațiile: ecrane publice, fără meniu.
const workspacesRoute = createRoute({ getParentRoute: () => rootRoute, path: paths.workspaces, component: Workspaces });
const inviteRoute = createRoute({ getParentRoute: () => rootRoute, path: paths.invite, component: InviteRoute });

const legacyRoutes = LEGACY_REDIRECTS.map(({ from, to }) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: from,
    beforeLoad: () => {
      throw redirect({ to, replace: true });
    },
  }),
);

const routeTree = rootRoute.addChildren([
  landingRoute,
  appRoute.addChildren(appChildren),
  loginRoute,
  authCallbackRoute,
  workspacesRoute,
  inviteRoute,
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
