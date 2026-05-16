/**
 * Client-facing API for the dashboard custom post.
 *
 * `?demo=1` returns seeded synthetic fixtures (src/lib/demo-fixtures.ts) so
 * the dashboard can be screenshotted / recorded end-to-end without depending
 * on real backend traffic. Production (no query param) returns real ZSET data;
 * fabricated data never auto-shows (Codex review M6).
 *
 * The wire shape omits the server-internal `v` and `nonce` fields — those
 * exist for storage versioning + ZSET-member uniqueness, not for the dashboard.
 */

import { Hono } from 'hono';
import { reddit } from '@devvit/web/server';
import { demoEvents, DEMO_STATS } from '../lib/demo-fixtures';
import { readRecent, type RecentEvent } from '../state/recentEvents';

export const api = new Hono();

api.get('/recent', async (c) => {
  if (c.req.query('demo') === '1') {
    console.log('[cm/api/recent] demo=1 — serving synthetic fixtures (not real ZSET)');
    return c.json({ events: demoEvents() });
  }

  let subName: string | undefined;
  try {
    subName = (await reddit.getCurrentSubreddit()).name;
  } catch (err) {
    console.error('[cm/api/recent] could not resolve current sub:', err);
    return c.json({ events: [] });
  }

  const events = await readRecent(subName);
  return c.json({ events: events.map(stripServerFields) });
});

function stripServerFields(e: RecentEvent) {
  // v + nonce are storage-internal — drop before sending to the client.
  const { v: _v, nonce: _nonce, ...wire } = e;
  return wire;
}

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
