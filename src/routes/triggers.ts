/**
 * Trigger handlers — MINIMAL STUBS for Phase 0 plumbing test.
 * Every handler returns empty 200. No imports beyond Hono. No logic.
 * Real implementations land in Phase 1+2.
 */

import { Hono } from 'hono';

export const triggers = new Hono();

triggers.post('/app-install', (c) => {
  console.log('[cm] app-install fired');
  return c.json({}, 200);
});

triggers.post('/app-upgrade', (c) => {
  console.log('[cm] app-upgrade fired');
  return c.json({}, 200);
});

triggers.post('/post-submit', (c) => {
  console.log('[cm] post-submit fired');
  return c.json({}, 200);
});

triggers.post('/comment-submit', (c) => {
  console.log('[cm] comment-submit fired');
  return c.json({}, 200);
});
