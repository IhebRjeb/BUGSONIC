import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

function revision() {
  try {
    const rev = execSync('git rev-parse --short HEAD').toString().trim();
    return execSync('git status --porcelain').toString().trim() ? `${rev}-dirty` : rev;
  } catch {
    return 'unknown';
  }
}

export default defineConfig({
  root: 'src/the-wall',
  define: {
    __BUGSONIC_REV__: JSON.stringify(revision()),
  },
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
  server: {
    open: true,
  },
});
