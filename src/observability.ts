import { initializeFaro } from '@grafana/faro-web-sdk';
import { version } from '../package.json';

/** Erori și Web Vitals către Grafana Cloud Frontend Observability. Fără URL (dev, teste) nu pornește. */
const url = import.meta.env.VITE_FARO_URL;

if (url) {
  initializeFaro({
    url,
    app: { name: 'nunta-start', version, environment: import.meta.env.MODE },
    // TanStack Router nu are integrare Faro: urmărim schimbările de URL automat.
    experimental: { trackNavigation: true },
    ignoreErrors: [
      // Ciudățenii de layout ale browserului, nu erori reale
      /^ResizeObserver loop limit exceeded$/,
      /^ResizeObserver loop completed with undelivered notifications$/,
      // Scripturi cross-origin fără stack util
      /^Script error\.$/,
      // Extensii de browser
      /chrome-extension:\/\//,
      /moz-extension:\/\//,
    ],
  });
}
