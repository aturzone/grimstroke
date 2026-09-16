import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    __VERSION__: '"0.0.0-test"',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
