import { createRootRoute, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router';
import { App } from './App';
import { LEGACY_REDIRECTS, paths } from './lib/paths';
import { Calculator } from './screens/Calculator';
import { Home } from './screens/Home';
import { Landing } from './screens/Landing';
import { LegalPage } from './screens/LegalPage';
import { Settings } from './screens/Settings';
import { SignIn } from './screens/SignIn';
import { Start } from './screens/Start';

const rootRoute = createRootRoute({ component: Outlet });

// Pagina publică, fără meniul aplicației.
const landingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Landing });

// Aplicația: meniul (sau Onboarding, când nu sunt date) învelește ecranele de sub /w.
const appRoute = createRoute({ getParentRoute: () => rootRoute, path: '/w', component: App });

const appChildren = [
  createRoute({ getParentRoute: () => appRoute, path: '/', component: Home }),
  createRoute({ getParentRoute: () => appRoute, path: '/start', component: Start }),
  createRoute({ getParentRoute: () => appRoute, path: '/calculator', component: Calculator }),
  createRoute({ getParentRoute: () => appRoute, path: '/settings', component: Settings }),
];

// Autentificarea: ecran public complet, în afara aplicației (fără meniu, fără Onboarding).
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: paths.login, component: SignIn });

// Pagini juridice publice (proiecte, noindex).
const legalRoutes = [
  createRoute({ getParentRoute: () => rootRoute, path: paths.privacy, component: () => <LegalPage doc="privacy" /> }),
  createRoute({ getParentRoute: () => rootRoute, path: paths.terms, component: () => <LegalPage doc="terms" /> }),
];

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
  ...legalRoutes,
  ...legacyRoutes,
]);

export const router = createRouter({ routeTree, scrollRestoration: true });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
