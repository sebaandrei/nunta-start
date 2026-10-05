import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Servit de Cloudflare Pages de la rădăcina domeniului; rutele SPA au nevoie de căi absolute.
  base: '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
  },
});
