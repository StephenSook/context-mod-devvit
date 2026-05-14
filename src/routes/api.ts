/**
 * Client-facing API for the dashboard custom post (Phase 3 Task 30).
 *
 * Stubs return empty shapes today; live ZRANGE wiring lands Phase 3.
 *
 * `?demo=1` query parameter returns seeded synthetic fixtures
 * (src/lib/demo-fixtures.ts) so the dashboard can be screenshotted /
 * recorded end-to-end without depending on Phase 1+2+3 backend.
 * Production (no query param) always returns the empty shape until
 * the real ZSET reads land — per Codex review M6, fabricated data
 * never auto-shows.
 */

import { Hono } from 'hono';
import { demoEvents, DEMO_STATS } from '../lib/demo-fixtures';

export const api = new Hono();

api.get('/recent', async (c) => {
  if (c.req.query('demo') === '1') {
    console.log('[cm/api/recent] demo=1 — serving synthetic fixtures (not real ZSET)');
    return c.json({ events: demoEvents() });
  }
  // TODO Phase 3 Task 29: ZRANGE events:recent 0 49 REV, return parsed JSON list
  return c.json({ events: [] });
});

api.get('/stats', async (c) => {
  if (c.req.query('demo') === '1') {
    console.log('[cm/api/stats] demo=1 — serving synthetic fixtures (not real rollup)');
    return c.json({ counters: DEMO_STATS });
  }
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
