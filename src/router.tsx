import { createRootRoute, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router';
import { App } from './App';
import { LEGACY_REDIRECTS, paths } from './lib/paths';
import { Calculator } from './screens/Calculator';
import { Home } from './screens/Home';
import { InviteRoute } from './screens/InviteAccept';
import { Landing } from './screens/Landing';
import { Settings } from './screens/Settings';
import { SignIn } from './screens/SignIn';
import { Start } from './screens/Start';
import { Workspaces } from './screens/Workspaces';

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
  workspacesRoute,
  inviteRoute,
  ...legacyRoutes,
]);

export const router = createRouter({ routeTree, scrollRestoration: true });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
