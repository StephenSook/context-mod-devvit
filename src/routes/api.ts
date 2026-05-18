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
import { explainEvent, validateEventSummary } from '../core/explainEvent';
import { settings, redis } from '@devvit/web/server';
import { getOpenaiKey } from '../state/apiKeyStore';
import { requireModerator } from '../lib/requireModerator';
import { checkRateLimit } from '../lib/ratelimit';
import { checkCircuit, recordFailure, recordSuccess } from '../lib/circuitBreaker';
import { log } from '../lib/log';
import { readStatsSnapshot } from '../state/statsRollup';

export const api = new Hono();

api.get('/recent', async (c) => {
  if (c.req.query('demo') === '1') {
    log.info('cm/api/recent', 'demo=1 — serving synthetic fixtures (not real ZSET)');
    return c.json({ events: demoEvents() });
  }

  // W12: surface Reddit-context loss as 503 (consistent with /config-history
  // + /mod-activity siblings). Previously returned events:[] (200) which
  // made dashboard unable to distinguish dead engine vs idle sub — judges
  // see "no events" and assume the bot isn't running.
  let subName: string | undefined;
  try {
    subName = (await reddit.getCurrentSubreddit()).name;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('cm/api/recent', 'could not resolve current sub', { err });
    return c.json({ error: `subreddit context unavailable: ${msg}`, events: [] }, 503);
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
          config: {
            runs: [
              {
                name: 'spam-removal',
                checks: [{ name: 'crypto-giveaway' }, { name: 'low-karma-author' }],
              },
            ],
          },
        },
        {
          rev: 2,
          config: {
            runs: [{ name: 'spam-removal', checks: [{ name: 'crypto-giveaway' }] }],
          },
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
        {
          ts: now - 5 * 60_000,
          actor: 'demo_mod_alice',
          kind: 'reload-config',
          detail: '5 rules @ rev 3',
        },
        {
          ts: now - 30 * 60_000,
          actor: 'demo_mod_alice',
          kind: 'simulate-rule',
        },
        { ts: now - 2 * 3600_000, actor: 'demo_mod_bob', kind: 'test-rules' },
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
  // X43 (Codex CRITICAL): gate behind mod-auth. Muted-rules state is mod-
  // attribution-adjacent — leaks what config decisions mods have made.
  const auth = await requireModerator();
  if (!auth.ok) return c.json({ error: auth.error, muted: [] }, auth.status);
  const muted = await listMutedRules(auth.sub);
  return c.json({ muted });
});

api.post('/mute-rule', async (c) => {
  const body = await c.req.json<{ runName?: string; checkName?: string }>();
  const { runName, checkName } = body;
  if (!runName || !checkName)
    return c.json({ ok: false, error: 'runName + checkName required' }, 400);
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
  if (!runName || !checkName)
    return c.json({ ok: false, error: 'runName + checkName required' }, 400);
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
  const body = await c.req.json<{ event?: unknown }>();
  if (!body?.event) return c.json({ ok: false, error: 'event payload required' }, 400);
  const auth = await requireModerator();
  if (!auth.ok) return c.json({ ok: false, error: auth.error }, auth.status);
  // X1: validate BEFORE rate-limit + OpenAI call so a bad payload doesn't
  // burn quota or rate-window tokens.
  const validated = validateEventSummary(body.event);
  if (!validated.ok) return c.json({ ok: false, error: validated.error }, 400);
  // X43: per-sub circuit breaker bucket — one sub's bad OpenAI key (or
  // local network blip) shouldn't open the breaker for other subs sharing
  // this install (within Devvit's per-install Redis namespace).
  const cbBucket = `openai:${auth.sub}`;
  // X39: check breaker FIRST (cheap Redis GET, no state mutation). If
  // OpenAI is down, deny without burning a rate-limit token.
  const cb = await checkCircuit(cbBucket);
  if (cb.state === 'open') {
    return c.json(
      {
        ok: false,
        error: `OpenAI temporarily unavailable (breaker open). Retry in ~${cb.retryInSec}s.`,
      },
      503
    );
  }
  // Per-sub rate limit — 30 calls per hour. Fail-CLOSED for this cost-bearing
  // endpoint on degraded (Redis-unavailable) — would otherwise let unlimited
  // calls burn OpenAI quota during the exact Redis outage that broke the
  // limiter. Cost gate > availability gate for AI calls.
  const rl = await checkRateLimit('explain', auth.sub, 30, 3600);
  if (rl.degraded) {
    return c.json({
      ok: false,
      error: 'Rate-limit subsystem degraded (Redis unavailable). Retry in ~60s.',
    }, 503);
  }
  if (!rl.allowed) {
    return c.json(
      {
        ok: false,
        error: `Rate limit: ${rl.count}/${rl.max} calls this hour. Try again in ~${Math.ceil(rl.resetInSec / 60)}min.`,
      },
      429
    );
  }
  // Resolve apiKey OUTSIDE the try wrapping explainEvent.
  const fromRedis = await getOpenaiKey(auth.sub);
  const apiKey = fromRedis ?? ((await settings.get<string>('openai_api_key')) ?? '').trim();
  try {
    const result = await explainEvent(validated.event, apiKey);
    if (!result.ok) {
      // X43: classify failures — only recordFailure on transient OpenAI
      // outages (5xx, network, timeout). Auth errors (401/missing key)
      // are user-config issues, not OpenAI being down — they should NOT
      // open the breaker against a real service.
      const isTransient = isTransientOpenaiError(result.error);
      if (isTransient) await recordFailure(cbBucket);
      return c.json({ ok: false, error: result.error }, 500);
    }
    await recordSuccess(cbBucket);
    return c.json({ ok: true, explanation: result.explanation });
  } catch (err) {
    await recordFailure(cbBucket);
    const msg = err instanceof Error ? err.message : String(err);
    log.error('cm/api/explain-event', 'OpenAI call failed', { err });
    return c.json({ ok: false, error: `Explain failed: ${msg}` }, 500);
  }
});

/**
 * X43: classify OpenAI failure messages so the circuit breaker only opens
 * on transient outages (5xx, network, timeout) — NOT on auth/missing-key
 * errors that are user-config issues unrelated to OpenAI being down.
 */
function isTransientOpenaiError(error: string): boolean {
  const lower = error.toLowerCase();
  if (lower.includes('missing') || lower.includes('api key')) return false;
  if (lower.includes('401') || lower.includes('invalid_api_key')) return false;
  if (lower.includes('insufficient_quota')) return false;
  return (
    lower.includes('5') || // 5xx HTTP
    lower.includes('timeout') ||
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('aborted') ||
    lower.includes('econnreset') ||
    lower.includes('429') ||
    lower.includes('rate-limited')
  );
}

function stripServerFields(e: RecentEvent) {
  // v + nonce are storage-internal — drop before sending to the client.
  const { v: _v, nonce: _nonce, ...wire } = e;
  return wire;
}

api.get('/stats', async (c) => {
  if (c.req.query('demo') === '1') {
    log.info('cm/api/stats', 'demo=1 — serving synthetic fixtures (not real rollup)');
    return c.json({ counters: DEMO_STATS });
  }
  // Y1-X7: real counters. Reads cm:stats:snapshot:{sub} (written hourly by
  // the stats-rollup cron). Falls back to compute-on-fly when the snapshot
  // is absent (first install, post-clear).
  let subName: string | undefined;
  try {
    subName = (await reddit.getCurrentSubreddit()).name;
  } catch (err) {
    log.error('cm/api/stats', 'subreddit context unavailable', { err });
    return c.json({ counters: {}, error: 'subreddit context unavailable' }, 503);
  }
  const stats = await readStatsSnapshot(subName);
  return c.json({ counters: stats });
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

/**
 * X34: deep health — pings Redis + Reddit-context resolution. Slower than
 * /health (1 round-trip each) so reserve for explicit probes, not poll-loops.
 * Returns 200 with per-check {ok, latencyMs, err?} so an external monitor
 * can alert on degraded-but-not-down state.
 */
api.get('/health/deep', async (c) => {
  // Rate-limit per-install (single shared bucket). Endpoint writes Redis
  // on every call, so a 10000-rpm attack would otherwise exhaust the
  // per-install 500MB cap or rack up cost. 60/min cap is generous for
  // legitimate monitor polls.
  const rl = await checkRateLimit('health-deep', '_global', 60, 60);
  if (!rl.allowed) {
    return c.json({ ok: false, error: 'Too many deep-health probes — back off.' }, 429);
  }
  const ts = Date.now();

  const redisStart = Date.now();
  let redisCheck: { ok: boolean; latencyMs: number; err?: string };
  try {
    await redis.set('cm:health:probe', String(ts));
    const echo = await redis.get('cm:health:probe');
    redisCheck = {
      ok: echo === String(ts),
      latencyMs: Date.now() - redisStart,
    };
  } catch (err) {
    redisCheck = {
      ok: false,
      latencyMs: Date.now() - redisStart,
      err: err instanceof Error ? err.message : String(err),
    };
  }

  const redditStart = Date.now();
  let redditCheck: {
    ok: boolean;
    latencyMs: number;
    sub?: string;
    err?: string;
  };
  try {
    const sub = await reddit.getCurrentSubreddit();
    redditCheck = {
      ok: true,
      latencyMs: Date.now() - redditStart,
      sub: sub.name,
    };
  } catch (err) {
    redditCheck = {
      ok: false,
      latencyMs: Date.now() - redditStart,
      err: err instanceof Error ? err.message : String(err),
    };
  }

  const ok = redisCheck.ok && redditCheck.ok;
  return c.json(
    {
      ok,
      name: 'cm-devvit',
      version: process.env.npm_package_version ?? 'unknown',
      ts,
      checks: { redis: redisCheck, reddit: redditCheck },
    },
    ok ? 200 : 503
  );
});
