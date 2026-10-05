import faroUploader from '@grafana/faro-rollup-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Source map-urile se urcă în Grafana Cloud doar când build-ul are cheia (build-ul Cloudflare Pages).
const { FARO_SOURCEMAP_ENDPOINT, FARO_SOURCEMAP_API_KEY, FARO_APP_ID, FARO_STACK_ID } = process.env;
const uploadSourceMaps = Boolean(FARO_SOURCEMAP_ENDPOINT && FARO_SOURCEMAP_API_KEY && FARO_APP_ID && FARO_STACK_ID);

export default defineConfig({
  // Servit de Cloudflare Pages de la rădăcina domeniului; rutele SPA au nevoie de căi absolute.
  base: '/',
  build: { sourcemap: uploadSourceMaps ? 'hidden' : false },
  plugins: [
    react(),
    tailwindcss(),
    uploadSourceMaps &&
      faroUploader({
        appName: 'nunta-start',
        endpoint: FARO_SOURCEMAP_ENDPOINT as string,
        apiKey: FARO_SOURCEMAP_API_KEY as string,
        appId: FARO_APP_ID as string,
        stackId: FARO_STACK_ID as string,
        gzipContents: true,
      }),
  ],
  test: {
    environment: 'node',
  },
});
