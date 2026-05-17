import { defineConfig } from 'vitest/config';

// Standalone test config — avoids loading vite.config.ts (which has the
// @devvit/start plugin that errors outside `vite build`). Tests run as plain
// node code with no Devvit runtime; production builds still use vite.config.ts.
//
// Per-file environment: tests in tests/client/ that exercise component
// behavior set `// @vitest-environment jsdom` at the top of the file. All other
// tests use the default node environment for speed.
export default defineConfig({
  plugins: [],
  test: {
    environment: 'node',
    include: ['tests/**/*.{test,test.tsx}.ts*'],
    globals: false,
  },
  // Allow .tsx test files (Header RTL renders use JSX).
  esbuild: {
    jsx: 'automatic',
  },
});
