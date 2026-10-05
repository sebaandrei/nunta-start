import { initializeFaro } from '@grafana/faro-web-sdk';
import { version } from '../package.json';

/** Erori și Web Vitals către Grafana Cloud Frontend Observability. Fără URL (dev, teste) nu pornește. */
export function initObservability() {
  const url = import.meta.env.VITE_FARO_URL;
  if (!url) return;

  initializeFaro({
    url,
    app: { name: 'nunta-start', version, environment: import.meta.env.MODE },
  });
}
