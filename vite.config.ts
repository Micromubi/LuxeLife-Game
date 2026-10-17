import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:play` bundles everything into one HTML file you can double-click.
export default defineConfig(({ mode }) => ({
  plugins: mode === 'play' ? [react(), viteSingleFile()] : [react()],
  build: mode === 'play' ? { outDir: 'play-build', emptyOutDir: true } : undefined,
}));
