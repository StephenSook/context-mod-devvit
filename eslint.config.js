import { defineConfig } from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default defineConfig([
  tseslint.configs.recommended,
  {
    // Server code — Node globals
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: [
      'src/server/**/*.{ts,tsx,mjs,cjs,js}',
      'src/lib/**/*.{ts,tsx,mjs,cjs,js}',
      'src/routes/**/*.{ts,tsx,mjs,cjs,js}',
      'src/core/**/*.{ts,tsx,mjs,cjs,js}',
      'src/rules/**/*.{ts,tsx,mjs,cjs,js}',
      'src/shared/**/*.{ts,tsx,mjs,cjs,js}',
      'src/state/**/*.{ts,tsx,mjs,cjs,js}',
      'src/actions/**/*.{ts,tsx,mjs,cjs,js}',
      'src/config/**/*.{ts,tsx,mjs,cjs,js}',
      'src/index.ts',
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.node,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Client code — Browser globals + React JSX. No project-based rules to avoid
    // "no-undef" on React (handled by TypeScript's JSX transform) while keeping
    // strict TS via type-check.
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/client/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser, React: 'readonly' },
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-undef': 'off', // TypeScript handles undefined references
    },
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': ['off'],
      'no-unused-vars': ['off'],
    },
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      'eslint.config.js',
      '**/vite.config.ts',
      'devvit.config.ts',
    ],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { js },
    extends: ['js/recommended'],
  },
]);
