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
import { getRecentRevs } from '../state/configStore';
import { readModActivity } from '../state/modActivity';

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

/**
 * Wave S Phase S9 — Config history endpoint for the rev-diff viewer.
 * Returns last 10 published config revisions w/ rev # + parsed config payload.
 * ?demo=1 returns synthetic fixtures so the dashboard renders the diff UI
 * without depending on a live install.
 */
api.get('/config-history', async (c) => {
  const limit = Math.min(Number.parseInt(c.req.query('limit') ?? '10', 10) || 10, 50);
  if (c.req.query('demo') === '1') {
    return c.json({
      revs: [
        {
          rev: 3,
          config: { runs: [{ name: 'spam-removal', checks: [{ name: 'crypto-giveaway' }, { name: 'low-karma-author' }] }] },
        },
        {
          rev: 2,
          config: { runs: [{ name: 'spam-removal', checks: [{ name: 'crypto-giveaway' }] }] },
        },
        {
          rev: 1,
          config: { runs: [{ name: 'spam-removal', checks: [] }] },
        },
      ],
    });
  }

  let subName: string | undefined;
  try {
    subName = (await reddit.getCurrentSubreddit()).name;
  } catch (err) {
    console.error('[cm/api/config-history] could not resolve current sub:', err);
    return c.json({ revs: [] });
  }

  const revs = await getRecentRevs(subName, limit);
  return c.json({ revs });
});

/**
 * Wave S Phase S3 — Mod activity log endpoint.
 * Returns last 50 mod-menu actions (reload-config, dry-run, etc) for the
 * provenance feed on the dashboard.
 */
api.get('/mod-activity', async (c) => {
  if (c.req.query('demo') === '1') {
    const now = Date.now();
    return c.json({
      activity: [
        { ts: now - 5 * 60_000, actor: 'CowSufficient3840', kind: 'reload-config', detail: '5 rules @ rev 3' },
        { ts: now - 30 * 60_000, actor: 'CowSufficient3840', kind: 'simulate-rule' },
        { ts: now - 2 * 3600_000, actor: 'vinhbin', kind: 'test-rules' },
      ],
    });
  }

  let subName: string | undefined;
  try {
    subName = (await reddit.getCurrentSubreddit()).name;
  } catch {
    return c.json({ activity: [] });
  }
  const activity = await readModActivity(subName);
  return c.json({ activity });
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
