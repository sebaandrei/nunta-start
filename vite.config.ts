import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Căi relative, ca build-ul să meargă pe GitHub Pages indiferent de numele repo-ului.
  base: './',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
  },
});
