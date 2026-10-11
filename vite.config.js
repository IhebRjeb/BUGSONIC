import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/the-wall',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
  server: {
    open: true,
  },
});
