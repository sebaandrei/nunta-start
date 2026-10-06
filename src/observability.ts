import { faro, initializeFaro } from '@grafana/faro-web-sdk';
import { version } from '../package.json';
import { redactDeep } from './lib/redact';

/** Erori și Web Vitals către Grafana Cloud Frontend Observability. Fără URL (dev, teste) nu pornește. */
const url = import.meta.env.VITE_FARO_URL;

if (url) {
  initializeFaro({
    url,
    app: { name: 'nunta-start', version, environment: import.meta.env.MODE },
    // TanStack Router nu are integrare Faro: urmărim schimbările de URL automat.
    experimental: { trackNavigation: true },
    // Adresele conțin tokenul invitației și codul de conectare: nu pleacă spre Grafana.
    beforeSend: (item) => redactDeep(item),
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

/** Trimite o eroare prinsă de un error boundary către Faro; fără Faro pornit (dev, teste) nu face nimic. */
export function reportError(error: unknown): void {
  faro.api?.pushError(error instanceof Error ? error : new Error(String(error)));
}
