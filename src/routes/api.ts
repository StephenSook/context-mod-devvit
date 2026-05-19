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
import { K } from '../state/keys';
import { fnv1a64 } from '../lib/idem';
import { getOpenaiKey } from '../state/apiKeyStore';
import { requireModerator } from '../lib/requireModerator';
import { checkRateLimit } from '../lib/ratelimit';
import { checkCircuit, recordFailure, recordSuccess } from '../lib/circuitBreaker';
import { log } from '../lib/log';
import { isTransientOpenaiError } from '../lib/openaiErrors';
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

  // AE Polish #68: silent-failure-hunter MEDIUM finding. readRecent's
  // OWN try/catch on the zRange returns [] on Redis failure, but its
  // inner JSON.parse / migrate() at line 84-90 catches per-row failures
  // — and a SYNCHRONOUS throw (e.g. malformed key, key argument
  // construction blow-up) that happens BEFORE entering readRecent's
  // try would propagate up here. Hono's default 500 response is HTML
  // — client extractServerError would surface "Unexpected token <"
  // noise instead of an actionable error. Wrap defensively so even
  // an unexpected throw produces a clean 503 + structured error body.
  let events;
  try {
    events = await readRecent(subName);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('cm/api/recent', 'readRecent threw — returning 503', { err: msg, sub: subName });
    return c.json({ error: `events unavailable: ${msg}`, events: [] }, 503);
  }
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
 * v0.5.5 (AE CRITICAL #4): hard-mute wired — runCheck reads this set on
 * every evaluation; a muted rule short-circuits as not-triggered before
 * any rule eval or action fires. Soft-mute (dashboard filter) is still
 * applied for already-fired events still in the recent-events ring buffer.
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
  // AE Pull-Forward #7: per-USER tighter cap on top of the per-sub gate.
  // Closes the "malicious or runaway mod burns the sub's whole quota" hole.
  // A sub with 5 mods + per-sub cap of 30/hr was effectively 6/hr/mod — but
  // one bad-actor mod (or a runaway scripted hit on the Explain button)
  // could consume all 30 alone. Per-user 10/hr means the worst single mod
  // gets 10 + the rest of the sub gets the remaining 20. Same fail-CLOSED
  // on degraded — cost gate first.
  const rlUser = await checkRateLimit('explain', `${auth.sub}:${auth.username}`, 10, 3600);
  if (rlUser.degraded) {
    return c.json({
      ok: false,
      error: 'Rate-limit subsystem degraded (Redis unavailable). Retry in ~60s.',
    }, 503);
  }
  if (!rlUser.allowed) {
    return c.json(
      {
        ok: false,
        error: `Your personal rate limit: ${rlUser.count}/${rlUser.max} calls this hour. Other mods on r/${auth.sub} can still use Explain — yours resets in ~${Math.ceil(rlUser.resetInSec / 60)}min.`,
      },
      429
    );
  }
  // AE Tier 1 #151 — response cache lookup BEFORE the cost-bearing OpenAI
  // call. Hash the event-summary shape (FNV-1a64 over the same fields
  // explainEvent sees) so two clicks on the same event return instantly +
  // cost $0. Cache is per-sub for tenant isolation + 24h TTL because
  // event-meaning doesn't change meaningfully within a day. Fail-OPEN on
  // Redis blip — we just lose the cache hit, the OpenAI call still works.
  const cacheKeyHash = fnv1a64(JSON.stringify(validated.value));
  const cacheKey = K.explainCache(cacheKeyHash, auth.sub);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      log.info('cm/api/explain-event', 'cache hit', { sub: auth.sub, cacheKey });
      return c.json({ ok: true, explanation: cached, cached: true });
    }
  } catch (err) {
    log.warn('cm/api/explain-event', 'cache read failed (fail-open, will call OpenAI)', { err });
  }

  // AD CRITICAL #1: previously `getOpenaiKey` + `settings.get` lived
  // outside the try block, so a Redis or Devvit-settings throw would
  // 500 the route w/ NO log.error, NO breaker classification, NO json
  // response. Wrap them in their own try so the failure surfaces as a
  // 503 + structured log instead of vanishing into the Hono error
  // handler. The breaker is NOT tripped here — Redis/settings being
  // down isn't an OpenAI outage.
  let apiKey: string;
  try {
    const fromRedis = await getOpenaiKey(auth.sub);
    apiKey = fromRedis ?? ((await settings.get<string>('openai_api_key')) ?? '').trim();
  } catch (err) {
    log.error('cm/api/explain-event', 'api-key resolve failed (Redis or settings throw)', { err });
    return c.json(
      {
        ok: false,
        error: 'Could not read OpenAI API key (Redis/settings unavailable). Retry in ~60s.',
      },
      503
    );
  }
  try {
    const result = await explainEvent(validated.value, apiKey);
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
    // AE Tier 1 #151 — write-through to the response cache so the next
    // click on this event returns instantly. Fail-OPEN: a Redis blip
    // means the next click pays for the OpenAI round-trip again (annoying
    // but not broken). 24h TTL aligns w/ "explanations don't change
    // meaningfully within a day."
    try {
      await redis.set(cacheKey, result.value, {
        expiration: new Date(Date.now() + 24 * 3600 * 1000),
      });
    } catch (err) {
      log.warn('cm/api/explain-event', 'cache write failed (fail-open)', { err });
    }
    // AD Phase 4: internal Result<string> exposes the text at `.value`; the
    // wire envelope keeps the `explanation` key for client backward-compat.
    return c.json({ ok: true, explanation: result.value });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // AD Tier-1 #3: parity w/ the result.error path above — classify the
    // exception before opening the breaker. Auth/config thrown errors
    // (no API key, parse failure, etc.) must NOT trip the breaker against
    // OpenAI itself; only transient 5xx/network/timeout/429 paths do.
    const isTransient = isTransientOpenaiError(msg);
    if (isTransient) await recordFailure(cbBucket);
    log.error('cm/api/explain-event', 'OpenAI call failed', {
      err,
      transient: isTransient,
    });
    return c.json({ ok: false, error: `Explain failed: ${msg}` }, 500);
  }
});

// X43 + AD CRITICAL #2 + #9: classifier moved to src/lib/openaiErrors.ts so
// the forms.ts + api.ts call sites can't drift on every fix.

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
  // AE Polish #68: same defense-in-depth as /api/recent above. Wrap
  // readStatsSnapshot so any unexpected throw (Redis call setup,
  // pre-try synchronous error, JSON.parse blowing up at the fallback
  // compute path) produces a structured 503 instead of Hono's default
  // HTML 500 (which client extractServerError can't parse).
  let stats;
  try {
    stats = await readStatsSnapshot(subName);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('cm/api/stats', 'readStatsSnapshot threw — returning 503', { err: msg, sub: subName });
    return c.json({ counters: {}, error: `stats unavailable: ${msg}` }, 503);
  }
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
  // AD Tier-1 #4: gate behind moderator auth. Endpoint writes to Redis
  // + calls reddit.getCurrentSubreddit on every probe, so an unauth
  // attacker could amplify load + leak per-sub timing telemetry. Real
  // external monitors that need this should run inside a mod context
  // or hit /health (the cheap, unauth liveness probe) instead.
  const auth = await requireModerator();
  if (!auth.ok) return c.json({ ok: false, error: auth.error }, auth.status);
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
