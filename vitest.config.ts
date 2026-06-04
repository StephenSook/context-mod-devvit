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
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/e2e/**', 'tests/bench/**', '**/__snapshots__/**'],
    globals: false,
    // codemirror-json-schema ships ESM/CJS files with extensionless sub-imports
    // (e.g. `from "./features/completion"`) that Node ESM resolution rejects.
    // server.deps.inline forces Vite's bundler to handle the package instead of
    // native Node, where extensionless imports resolve correctly.
    server: {
      deps: {
        inline: ['codemirror-json-schema'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/client/main.tsx', 'src/lib/demo-fixtures.ts'],
      reportsDirectory: './coverage',
      // AA: informational thresholds. ci.yml runs --coverage w/
      // continue-on-error so a dip doesn't block CI; thresholds give the
      // report a target to track against. Tuned to current baseline w/ a
      // small buffer so honest regressions show up + style noise doesn't.
      thresholds: {
        statements: 55,
        branches: 70,
        functions: 65,
        lines: 55,
      },
    },
  },
  // Allow .tsx test files (Header RTL renders use JSX).
  esbuild: {
    jsx: 'automatic',
  },
});
