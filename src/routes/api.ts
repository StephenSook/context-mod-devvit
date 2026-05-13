/**
 * Client-facing API for the dashboard custom post (Phase 3 Task 30).
 *
 * STUBS for Phase 0.
 */

import { Hono } from 'hono';

export const api = new Hono();

api.get('/recent', async (c) => {
  // TODO Phase 3 Task 29: ZRANGE events:recent 0 49 REV, return parsed JSON list
  return c.json({ events: [] });
});

api.get('/stats', async (c) => {
  // TODO Phase 4 Task 41: return aggregated stats:rollup:7d hash
  return c.json({ counters: {} });
});

/**
 * Lightweight liveness probe. Returns app version + server timestamp so external
 * checks (and our own dashboard reload button) can verify the server is alive
 * without paying for a Redis round-trip. Cacheable: no.
 */
api.get('/health', (c) => {
  return c.json({
    ok: true,
    name: 'cm-devvit',
    version: process.env.npm_package_version ?? 'unknown',
    ts: Date.now(),
  });
});
