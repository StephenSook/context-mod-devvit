import { defineConfig } from 'vitest/config';

// Standalone test config — avoids loading vite.config.ts (which has the
// @devvit/start plugin that errors outside `vite build`). Tests run as plain
// node code with no Devvit runtime; production builds still use vite.config.ts.
export default defineConfig({
  plugins: [],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
});
