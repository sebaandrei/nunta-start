import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { App } from './App';
import { Calculator } from './screens/Calculator';
import { Home } from './screens/Home';
import { Settings } from './screens/Settings';
import { Start } from './screens/Start';

const rootRoute = createRootRoute({ component: App });

const routeTree = rootRoute.addChildren([
  createRoute({ getParentRoute: () => rootRoute, path: '/', component: Home }),
  createRoute({ getParentRoute: () => rootRoute, path: '/start', component: Start }),
  createRoute({ getParentRoute: () => rootRoute, path: '/calculator', component: Calculator }),
  createRoute({ getParentRoute: () => rootRoute, path: '/settings', component: Settings }),
]);

export const router = createRouter({ routeTree, scrollRestoration: true });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
