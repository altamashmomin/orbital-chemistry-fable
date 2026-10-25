import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5180, strictPort: true, open: false },
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1000 },
});
