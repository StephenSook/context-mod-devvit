import { defineConfig } from 'vite';
import { devvit } from '@devvit/start/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// AE Polish #60: inline package.json version at build time. Codex-rescue
// 4th-pass review caught: src/routes/api.ts /health + /health/deep read
// `process.env.npm_package_version` which is set by `npm run` but NOT in
// Devvit's serverless runtime. Production /health responses fell back to
// `version: "unknown"`. Build-time inline makes the version reliable in
// every environment.
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf-8')
) as { version: string };

export default defineConfig({
  base: './',
  plugins: [devvit(), react()],
  define: {
    'process.env.npm_package_version': JSON.stringify(pkg.version),
  },
});
