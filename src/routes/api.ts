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
import { muteRule, unmuteRule, listMutedRules } from '../state/muteSet';
import { logModActivity } from '../state/modActivity';
import { explainEvent, type EventSummary } from '../core/explainEvent';
import { settings } from '@devvit/web/server';
import { getOpenaiKey } from '../state/apiKeyStore';
import { requireModerator } from '../lib/requireModerator';

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

  // W2: gate behind mod-auth. Config history exposes prior rule payloads
  // that may include sub-internal heuristics mods don't want public.
  const auth = await requireModerator();
  if (!auth.ok) return c.json({ error: auth.error, revs: [] }, auth.status);
  const revs = await getRecentRevs(auth.sub, limit);
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

  // W2: gate behind mod-auth. Activity feed exposes mod usernames + actions
  // — non-mods viewing the dashboard custom post could enumerate which mods
  // are active and what tools they use without this gate.
  const auth = await requireModerator();
  if (!auth.ok) return c.json({ error: auth.error, activity: [] }, auth.status);
  const activity = await readModActivity(auth.sub);
  return c.json({ activity });
});

/**
 * Wave S Phase S10 — Muted rules endpoints.
 * GET /api/muted-rules returns array of run/check keys currently muted.
 * POST /api/mute-rule + POST /api/unmute-rule mutate the set.
 *
 * v0: soft mute — dashboard filters events with these rule keys. Backend
 * eval still fires (Vinh's runCheck.ts unchanged). Phase 4 follow-up will
 * read this set in runCheck for hard-mute.
 */
api.get('/muted-rules', async (c) => {
  if (c.req.query('demo') === '1') {
    return c.json({ muted: [] });
  }
  let subName: string | undefined;
  try {
    subName = (await reddit.getCurrentSubreddit()).name;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cm/api/muted-rules] could not resolve current sub:', err);
    return c.json({ error: `subreddit context unavailable: ${msg}` }, 500);
  }
  const muted = await listMutedRules(subName);
  return c.json({ muted });
});

api.post('/mute-rule', async (c) => {
  const body = await c.req.json<{ runName?: string; checkName?: string }>();
  const { runName, checkName } = body;
  if (!runName || !checkName) return c.json({ ok: false, error: 'runName + checkName required' }, 400);
  // Wave U BLOCKER fix: verify caller is a mod before mutating shared state.
  const auth = await requireModerator();
  if (!auth.ok) return c.json({ ok: false, error: auth.error }, auth.status);
  const result = await muteRule(auth.sub, runName, checkName);
  if (!result.ok) return c.json({ ok: false, error: result.error }, 500);
  await logModActivity(auth.sub, {
    ts: Date.now(),
    actor: auth.username,
    kind: 'mute-rule',
    detail: `${runName}/${checkName}`,
  });
  return c.json({ ok: true });
});

api.post('/unmute-rule', async (c) => {
  const body = await c.req.json<{ runName?: string; checkName?: string }>();
  const { runName, checkName } = body;
  if (!runName || !checkName) return c.json({ ok: false, error: 'runName + checkName required' }, 400);
  const auth = await requireModerator();
  if (!auth.ok) return c.json({ ok: false, error: auth.error }, auth.status);
  const result = await unmuteRule(auth.sub, runName, checkName);
  if (!result.ok) return c.json({ ok: false, error: result.error }, 500);
  await logModActivity(auth.sub, {
    ts: Date.now(),
    actor: auth.username,
    kind: 'unmute-rule',
    detail: `${runName}/${checkName}`,
  });
  return c.json({ ok: true });
});

/**
 * Wave V Phase V7 — POST /api/explain-event
 * Mod-auth gated (only mods can burn the OpenAI quota). Body = EventSummary.
 * Returns { ok, explanation } or { ok:false, error }.
 */
api.post('/explain-event', async (c) => {
  const body = await c.req.json<{ event?: EventSummary }>();
  if (!body?.event) return c.json({ ok: false, error: 'event payload required' }, 400);
  const auth = await requireModerator();
  if (!auth.ok) return c.json({ ok: false, error: auth.error }, auth.status);
  try {
    const fromRedis = await getOpenaiKey(auth.sub);
    const apiKey = fromRedis ?? ((await settings.get<string>('openai_api_key')) ?? '').trim();
    const result = await explainEvent(body.event, apiKey);
    if (!result.ok) return c.json({ ok: false, error: result.error }, 500);
    return c.json({ ok: true, explanation: result.explanation });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cm/api/explain-event] failed:', err);
    return c.json({ ok: false, error: `Explain failed: ${msg}` }, 500);
  }
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
