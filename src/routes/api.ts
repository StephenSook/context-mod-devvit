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

api.get('/health', (c) => c.json({ ok: true, version: '0.0.1' }));
