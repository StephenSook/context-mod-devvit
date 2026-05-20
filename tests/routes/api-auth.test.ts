/**
 * W8 regression — every mutation + cost-bearing /api/* endpoint MUST
 * reject non-mods with the appropriate HTTP status BEFORE touching state.
 *
 * Pins the Wave U BLOCKER fixes (mute auth) + Wave W BLOCKER fixes
 * (mod-data leak via /api/mod-activity + /api/config-history) so any
 * future refactor that drops a requireModerator call breaks CI.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireModeratorMock = vi.fn();
const muteRule = vi.fn();
const unmuteRule = vi.fn();
const listMutedRules = vi.fn();
const logModActivity = vi.fn();
const readModActivity = vi.fn();
const getRecentRevs = vi.fn();
const readRecent = vi.fn();
const explainEvent = vi.fn();
const validateEventSummary = vi.fn();
const checkRateLimit = vi.fn();
const checkCircuit = vi.fn();
const recordFailure = vi.fn();
const recordSuccess = vi.fn();
const getOpenaiKey = vi.fn();
const settingsGet = vi.fn();
const getCurrentSubreddit = vi.fn(async () => ({ name: 'r_test' }));

const redisGet = vi.fn();
const redisSet = vi.fn();

vi.mock('@devvit/web/server', () => ({
  reddit: { getCurrentSubreddit: () => getCurrentSubreddit() },
  settings: { get: (k: string) => settingsGet(k) },
  redis: {
    get: (k: string) => redisGet(k),
    set: (k: string, v: string, opts?: unknown) => redisSet(k, v, opts),
  },
}));
vi.mock('../../src/lib/requireModerator', () => ({
  requireModerator: () => requireModeratorMock(),
}));
vi.mock('../../src/state/muteSet', () => ({
  muteRule: (...a: unknown[]) => muteRule(...a),
  unmuteRule: (...a: unknown[]) => unmuteRule(...a),
  listMutedRules: (...a: unknown[]) => listMutedRules(...a),
}));
vi.mock('../../src/state/modActivity', () => ({
  logModActivity: (...a: unknown[]) => logModActivity(...a),
  readModActivity: (...a: unknown[]) => readModActivity(...a),
}));
vi.mock('../../src/state/configStore', () => ({
  getRecentRevs: (...a: unknown[]) => getRecentRevs(...a),
}));
vi.mock('../../src/state/recentEvents', () => ({
  readRecent: (...a: unknown[]) => readRecent(...a),
}));
vi.mock('../../src/core/explainEvent', () => ({
  explainEvent: (...a: unknown[]) => explainEvent(...a),
  validateEventSummary: (...a: unknown[]) => validateEventSummary(...a),
}));
vi.mock('../../src/state/apiKeyStore', () => ({
  getOpenaiKey: (...a: unknown[]) => getOpenaiKey(...a),
}));
vi.mock('../../src/lib/ratelimit', () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimit(...a),
}));
vi.mock('../../src/lib/circuitBreaker', () => ({
  checkCircuit: (...a: unknown[]) => checkCircuit(...a),
  recordFailure: (...a: unknown[]) => recordFailure(...a),
  recordSuccess: (...a: unknown[]) => recordSuccess(...a),
}));
const readStatsSnapshot = vi.fn();
vi.mock('../../src/state/statsRollup', () => ({
  readStatsSnapshot: (...a: unknown[]) => readStatsSnapshot(...a),
}));

import { api } from '../../src/routes/api';

const NON_MOD = {
  ok: false as const,
  status: 403 as const,
  error: 'not a moderator of this sub',
};
const AS_MOD = { ok: true as const, sub: 'r_test', username: 'mod_alice' };

beforeEach(() => {
  vi.clearAllMocks();
  validateEventSummary.mockImplementation((event: unknown) => ({
    ok: true,
    value: event,
  }));
  checkRateLimit.mockResolvedValue({
    allowed: true,
    count: 1,
    max: 30,
    resetInSec: 3600,
  });
  checkCircuit.mockResolvedValue({ state: 'closed' });
  recordFailure.mockResolvedValue(undefined);
  recordSuccess.mockResolvedValue(undefined);
  // AE Tier 1 #151: default redis.get → null (cache miss) so existing
  // tests fall through to the OpenAI call path; cache-specific tests
  // override per-case.
  redisGet.mockResolvedValue(null);
  redisSet.mockResolvedValue('OK');
});

async function postJson(path: string, body: unknown): Promise<Response> {
  return api.request(
    new Request(`http://x${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

async function getJson(path: string): Promise<Response> {
  return api.request(new Request(`http://x${path}`));
}

describe('POST /api/mute-rule (W8)', () => {
  it('rejects non-mod with 403 and does NOT call muteRule', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const res = await postJson('/mute-rule', {
      runName: 'spam',
      checkName: 'crypto',
    });
    expect(res.status).toBe(403);
    expect(muteRule).not.toHaveBeenCalled();
    expect(logModActivity).not.toHaveBeenCalled();
  });

  it('allows mod + logs activity with auth.username (not body) — prevents log spoofing', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    muteRule.mockResolvedValue({ ok: true });
    const res = await postJson('/mute-rule', {
      runName: 'spam',
      checkName: 'crypto',
      actor: 'evil_user',
    });
    expect(res.status).toBe(200);
    expect(muteRule).toHaveBeenCalledWith('r_test', 'spam', 'crypto');
    const entry = logModActivity.mock.calls[0]?.[1] as { actor: string };
    expect(entry.actor).toBe('mod_alice');
  });

  it('returns 400 when body missing runName or checkName (validation before auth-cost)', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    const res = await postJson('/mute-rule', { runName: 'spam' });
    expect(res.status).toBe(400);
    expect(muteRule).not.toHaveBeenCalled();
  });
});

describe('POST /api/unmute-rule (W8)', () => {
  it('rejects non-mod with 403 and does NOT call unmuteRule', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const res = await postJson('/unmute-rule', {
      runName: 'spam',
      checkName: 'crypto',
    });
    expect(res.status).toBe(403);
    expect(unmuteRule).not.toHaveBeenCalled();
  });
});

describe('POST /api/explain-event (W8)', () => {
  it('rejects non-mod with 403 and does NOT call OpenAI (quota protection)', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const res = await postJson('/explain-event', { event: { kind: 'remove' } });
    expect(res.status).toBe(403);
    expect(explainEvent).not.toHaveBeenCalled();
  });

  it('returns 400 when body.event is missing', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    const res = await postJson('/explain-event', {});
    expect(res.status).toBe(400);
    expect(explainEvent).not.toHaveBeenCalled();
  });

  it('X1 returns 400 when validation rejects payload', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    validateEventSummary.mockReturnValueOnce({
      ok: false,
      error: 'matchedSubstring exceeds 200 chars',
    });
    const res = await postJson('/explain-event', {
      event: { matchedSubstring: 'x' },
    });
    expect(res.status).toBe(400);
    expect(explainEvent).not.toHaveBeenCalled();
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it('X1 returns 429 when rate-limit denies', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    checkRateLimit.mockResolvedValueOnce({
      allowed: false,
      count: 31,
      max: 30,
      resetInSec: 1800,
    });
    const res = await postJson('/explain-event', { event: { kind: 'remove' } });
    expect(res.status).toBe(429);
    expect(explainEvent).not.toHaveBeenCalled();
  });

  it('X37 returns 503 when circuit breaker is open', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    checkCircuit.mockResolvedValueOnce({ state: 'open', retryInSec: 42 });
    const res = await postJson('/explain-event', { event: { kind: 'remove' } });
    expect(res.status).toBe(503);
    expect(explainEvent).not.toHaveBeenCalled();
  });

  it('X37 records success when explainEvent returns ok + emits wire envelope w/ explanation key', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    getOpenaiKey.mockResolvedValue('sk-x');
    explainEvent.mockResolvedValue({ ok: true, value: 'why' });
    const res = await postJson('/explain-event', { event: { kind: 'remove' } });
    expect(recordSuccess).toHaveBeenCalledWith('openai:r_test');
    expect(recordFailure).not.toHaveBeenCalled();
    // AD code-review MEDIUM #3: pin the wire shape — internal Result<string>
    // exposes `.value` but the wire envelope MUST stay `{ok, explanation}`
    // because src/client/components/EventDetails.tsx reads `data.explanation` via setState({loading:false, explanation:data.explanation}).
    const body = await res.json();
    expect(body).toEqual({ ok: true, explanation: 'why' });
  });

  it('X37 records failure when explainEvent returns error', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    getOpenaiKey.mockResolvedValue('sk-x');
    explainEvent.mockResolvedValue({ ok: false, error: 'OpenAI 500' });
    await postJson('/explain-event', { event: { kind: 'remove' } });
    expect(recordFailure).toHaveBeenCalledWith('openai:r_test');
    expect(recordSuccess).not.toHaveBeenCalled();
  });

  it('AE Tier 1 #151: cache HIT returns instantly + skips OpenAI call + skips rate-limit consumption', async () => {
    // Cache returns a previously-stored explanation → response is cached:true,
    // explainEvent is NEVER called, rate-limit counter is NEVER bumped
    // (cache hit returns before the per-user gate).
    requireModeratorMock.mockResolvedValue(AS_MOD);
    redisGet.mockResolvedValueOnce('this is the cached explanation');
    const res = await postJson('/explain-event', { event: { kind: 'remove' } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; explanation: string; cached: boolean };
    expect(body.ok).toBe(true);
    expect(body.explanation).toBe('this is the cached explanation');
    expect(body.cached).toBe(true);
    expect(explainEvent).not.toHaveBeenCalled();
    expect(getOpenaiKey).not.toHaveBeenCalled();
  });

  it('AE Tier 1 #151: cache MISS proceeds to OpenAI call + writes through on success', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    redisGet.mockResolvedValue(null); // miss
    getOpenaiKey.mockResolvedValue('sk-x');
    explainEvent.mockResolvedValue({ ok: true, value: 'fresh explanation' });
    const res = await postJson('/explain-event', { event: { kind: 'remove' } });
    expect(res.status).toBe(200);
    expect(explainEvent).toHaveBeenCalled();
    // Write-through: redis.set called w/ the explanation + a 24h TTL expiration option.
    expect(redisSet).toHaveBeenCalled();
    const setArgs = redisSet.mock.calls[0]!;
    expect(setArgs[1]).toBe('fresh explanation');
    expect(setArgs[2]).toMatchObject({ expiration: expect.any(Date) });
  });

  it('AE Tier 1 #151: cache READ failure is fail-OPEN — proceeds to OpenAI call', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    redisGet.mockRejectedValueOnce(new Error('redis blip'));
    getOpenaiKey.mockResolvedValue('sk-x');
    explainEvent.mockResolvedValue({ ok: true, value: 'fallback explanation' });
    const res = await postJson('/explain-event', { event: { kind: 'remove' } });
    expect(res.status).toBe(200);
    // OpenAI still called despite Redis read failure — fail-OPEN means
    // user doesn't see a degraded experience when Redis is the blip.
    expect(explainEvent).toHaveBeenCalled();
  });

  it('prefers Redis key over Devvit setting when both present', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    getOpenaiKey.mockResolvedValue('sk-redis-key');
    settingsGet.mockResolvedValue('sk-settings-key');
    explainEvent.mockResolvedValue({ ok: true, value: 'because spam' });
    const res = await postJson('/explain-event', { event: { kind: 'remove' } });
    expect(res.status).toBe(200);
    expect(explainEvent).toHaveBeenCalledWith({ kind: 'remove' }, 'sk-redis-key');
  });

  it('falls back to Devvit setting when Redis returns null', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    getOpenaiKey.mockResolvedValue(null);
    settingsGet.mockResolvedValue('sk-settings-key');
    explainEvent.mockResolvedValue({ ok: true, value: 'because spam' });
    await postJson('/explain-event', { event: { kind: 'remove' } });
    expect(explainEvent).toHaveBeenCalledWith({ kind: 'remove' }, 'sk-settings-key');
  });
});

describe('GET /api/mod-activity (W8 — W2 mod-data leak fix)', () => {
  it('rejects non-mod with 403', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const res = await getJson('/mod-activity');
    expect(res.status).toBe(403);
    expect(readModActivity).not.toHaveBeenCalled();
  });

  it('demo=1 bypasses auth (synthetic fixtures are not sensitive)', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const res = await getJson('/mod-activity?demo=1');
    expect(res.status).toBe(200);
    expect(requireModeratorMock).not.toHaveBeenCalled();
  });

  it('AE Polish #9: demo fixture uses obvious-fake usernames (no real handles)', async () => {
    // AD CRITICAL fix (f9c1bf4): demo previously seeded `CowSufficient3840`
    // + `vinhbin` — real Reddit/GitHub identities baked into a shared
    // fixture. Now `demo_mod_alice` + `demo_mod_bob` — obvious-synthetic.
    // This test pins the obfuscation so a future "let's rebrand demo
    // data" refactor (or accidental revert to real handles) fails CI
    // loudly. Privacy-claim regression protection.
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const res = await getJson('/mod-activity?demo=1');
    const body = (await res.json()) as { activity: { actor: string }[] };
    const actors = body.activity.map((a) => a.actor);
    expect(actors).toContain('demo_mod_alice');
    expect(actors).toContain('demo_mod_bob');
    // Real handles MUST NOT appear in synthetic fixtures.
    expect(actors).not.toContain('CowSufficient3840');
    expect(actors).not.toContain('vinhbin');
  });
});

describe('GET /api/config-history (W8 — W2 mod-data leak fix)', () => {
  it('rejects non-mod with 403', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const res = await getJson('/config-history');
    expect(res.status).toBe(403);
    expect(getRecentRevs).not.toHaveBeenCalled();
  });

  it('demo=1 bypasses auth', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const res = await getJson('/config-history?demo=1');
    expect(res.status).toBe(200);
    expect(requireModeratorMock).not.toHaveBeenCalled();
  });

  it('Polish #27: mod auth + getRecentRevs returns 200 w/ revs array', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    getRecentRevs.mockResolvedValueOnce([
      { rev: 5, config: { runs: [{ name: 'r1' }] } },
      { rev: 4, config: { runs: [] } },
    ]);
    const res = await getJson('/config-history');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { revs: { rev: number }[] };
    expect(body.revs).toHaveLength(2);
    expect(body.revs[0]?.rev).toBe(5);
    expect(getRecentRevs).toHaveBeenCalledWith('r_test', 10);
  });

  it('Polish #27: ?limit=N clamped to max 50', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    getRecentRevs.mockResolvedValueOnce([]);
    await getJson('/config-history?limit=999');
    expect(getRecentRevs).toHaveBeenCalledWith('r_test', 50);
  });

  it('Polish #27: non-numeric ?limit defaults to 10', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    getRecentRevs.mockResolvedValueOnce([]);
    await getJson('/config-history?limit=abc');
    expect(getRecentRevs).toHaveBeenCalledWith('r_test', 10);
  });
});

// ============================================================================
// AE Polish #27 — happy-path coverage for endpoints previously only auth-tested
// ============================================================================

describe('POST /api/mute-rule happy path (Polish #27)', () => {
  it('logs ModActivity entry with kind="mute-rule" + actor=auth.username + detail=run/check', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    muteRule.mockResolvedValueOnce({ ok: true });
    const res = await postJson('/mute-rule', {
      runName: 'spam',
      checkName: 'crypto',
    });
    expect(res.status).toBe(200);
    expect(logModActivity).toHaveBeenCalledTimes(1);
    const [sub, entry] = logModActivity.mock.calls[0] as [
      string,
      { kind: string; actor: string; detail: string; ts: number },
    ];
    expect(sub).toBe('r_test');
    expect(entry.kind).toBe('mute-rule');
    expect(entry.actor).toBe('mod_alice');
    expect(entry.detail).toBe('spam/crypto');
    expect(typeof entry.ts).toBe('number');
  });

  it('500 when muteRule returns Err Result — does NOT log activity', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    muteRule.mockResolvedValueOnce({ ok: false, error: 'Redis down' });
    const res = await postJson('/mute-rule', {
      runName: 'spam',
      checkName: 'crypto',
    });
    expect(res.status).toBe(500);
    expect(logModActivity).not.toHaveBeenCalled();
  });
});

describe('POST /api/unmute-rule happy path (Polish #27)', () => {
  it('auth + calls unmuteRule + logs ModActivity with kind="unmute-rule"', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    unmuteRule.mockResolvedValueOnce({ ok: true });
    const res = await postJson('/unmute-rule', {
      runName: 'spam',
      checkName: 'crypto',
    });
    expect(res.status).toBe(200);
    expect(unmuteRule).toHaveBeenCalledWith('r_test', 'spam', 'crypto');
    expect(logModActivity).toHaveBeenCalledTimes(1);
    const entry = logModActivity.mock.calls[0]?.[1] as {
      kind: string;
      actor: string;
      detail: string;
    };
    expect(entry.kind).toBe('unmute-rule');
    expect(entry.actor).toBe('mod_alice');
    expect(entry.detail).toBe('spam/crypto');
  });

  it('500 when unmuteRule returns Err Result — does NOT log activity', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    unmuteRule.mockResolvedValueOnce({ ok: false, error: 'mute not found' });
    const res = await postJson('/unmute-rule', {
      runName: 'spam',
      checkName: 'crypto',
    });
    expect(res.status).toBe(500);
    expect(logModActivity).not.toHaveBeenCalled();
  });

  it('returns 400 on missing runName/checkName (validate before auth-cost)', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    const res = await postJson('/unmute-rule', { runName: 'spam' });
    expect(res.status).toBe(400);
    expect(unmuteRule).not.toHaveBeenCalled();
  });
});

describe('GET /api/muted-rules happy path (Polish #27)', () => {
  it('demo=1 returns empty list w/o auth', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const res = await getJson('/muted-rules?demo=1');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { muted: unknown[] };
    expect(body.muted).toEqual([]);
    expect(requireModeratorMock).not.toHaveBeenCalled();
  });

  it('rejects non-mod with 403', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const res = await getJson('/muted-rules');
    expect(res.status).toBe(403);
    expect(listMutedRules).not.toHaveBeenCalled();
  });

  it('mod auth + listMutedRules returns 200 w/ array', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    listMutedRules.mockResolvedValueOnce([
      { runName: 'r1', checkName: 'c1', mutedAt: '2026-05-19T00:00:00Z' },
    ]);
    const res = await getJson('/muted-rules');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { muted: { runName: string }[] };
    expect(body.muted[0]?.runName).toBe('r1');
    expect(listMutedRules).toHaveBeenCalledWith('r_test');
  });
});

describe('GET /api/mod-activity happy path (Polish #27)', () => {
  it('mod auth + readModActivity returns 200 w/ activity array', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    readModActivity.mockResolvedValueOnce([
      { ts: 1, actor: 'mod_alice', action: 'mute', runName: 'r1', checkName: 'c1' },
    ]);
    const res = await getJson('/mod-activity');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { activity: { actor: string }[] };
    expect(body.activity[0]?.actor).toBe('mod_alice');
    expect(readModActivity).toHaveBeenCalledWith('r_test');
  });
});

describe('GET /api/recent happy path (Polish #27)', () => {
  it('demo=1 returns synthetic events w/o calling getCurrentSubreddit', async () => {
    const res = await getJson('/recent?demo=1');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { events: unknown[] };
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.events.length).toBeGreaterThan(0);
    expect(getCurrentSubreddit).not.toHaveBeenCalled();
    expect(readRecent).not.toHaveBeenCalled();
  });

  it('Polish #135: rejects non-mod with 403 and does NOT call readRecent (SampleOfNone-flagged leak fix)', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const res = await getJson('/recent');
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string; events: unknown[] };
    expect(body.error).toMatch(/not a moderator/i);
    expect(body.events).toEqual([]);
    expect(readRecent).not.toHaveBeenCalled();
  });

  it('non-demo: mod-auth + readRecent + strips server-only v/nonce fields', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    // stripServerFields drops `v` (schema version) and `nonce` (storage-only)
    // before wire-emit so client never sees those internals.
    readRecent.mockResolvedValueOnce([
      {
        ts: 1,
        activityId: 't3_a',
        runName: 'r1',
        checkName: 'c1',
        triggered: true,
        actions: [{ kind: 'remove', ok: true }],
        v: 1,
        nonce: 'storage-only-internal',
      },
    ]);
    const res = await getJson('/recent');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { events: Record<string, unknown>[] };
    expect(body.events).toHaveLength(1);
    expect(body.events[0]?.v).toBeUndefined();
    expect(body.events[0]?.nonce).toBeUndefined();
    // Functional fields preserved.
    expect(body.events[0]?.activityId).toBe('t3_a');
    expect(body.events[0]?.runName).toBe('r1');
    expect(readRecent).toHaveBeenCalledWith('r_test');
  });

  it('Polish #135: requireModerator transient 503 propagates (sub-context loss path now subsumed under mod gate)', async () => {
    // Polish #135 removed the inline getCurrentSubreddit try/catch in
    // favor of routing all sub resolution through requireModerator. The
    // helper has its own transient classifier that returns 503 on
    // ECONNRESET / 5xx / timeout / rate-limit. Pin that path here.
    requireModeratorMock.mockResolvedValue({
      ok: false as const,
      status: 503 as const,
      error: 'mod check transient failure (retry in ~30s): ECONNRESET',
    });
    const res = await getJson('/recent');
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string; events: unknown[] };
    expect(body.error).toMatch(/transient/i);
    expect(body.events).toEqual([]);
    expect(readRecent).not.toHaveBeenCalled();
  });

  // AE Polish #93: gap caught by pr-test-analyzer. The Polish #68
  // defensive wrap on `readRecent` (api.ts try/catch around the helper
  // call) had no test, only the sibling getCurrentSubreddit-rejection
  // path was covered. A regression removing the try/catch wrap would
  // pass all prior tests but produce Hono's HTML 500 page when readRecent
  // throws synchronously.
  it('Polish #68: 503 + structured body when readRecent throws synchronously', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    readRecent.mockImplementationOnce(() => {
      throw new Error('sync boom — key construction blew up');
    });
    const res = await getJson('/recent');
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string; events: unknown[] };
    expect(body.error).toMatch(/events unavailable/i);
    expect(body.error).toContain('sync boom');
    expect(body.events).toEqual([]);
  });
});

describe('GET /api/stats happy path (Polish #27)', () => {
  it('demo=1 returns DEMO_STATS counters w/o sub resolution', async () => {
    const res = await getJson('/stats?demo=1');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      counters: { hourlyActions24h?: number[] };
    };
    expect(Array.isArray(body.counters.hourlyActions24h)).toBe(true);
    expect(body.counters.hourlyActions24h).toHaveLength(24);
    expect(getCurrentSubreddit).not.toHaveBeenCalled();
  });

  it('Polish #135: rejects non-mod with 403 and does NOT call readStatsSnapshot (SampleOfNone-flagged leak fix)', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const res = await getJson('/stats');
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string; counters: unknown };
    expect(body.error).toMatch(/not a moderator/i);
    expect(body.counters).toEqual({});
    expect(readStatsSnapshot).not.toHaveBeenCalled();
  });

  it('non-demo: mod-auth + readStatsSnapshot returns snapshot counters', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    // Polish #38: snapshot now includes BOTH legacy server fields
    // (total/today/lastHour) AND client-shape fields (actionsToday/
    // timeSavedMin/activeRules/topRule/hourlyActions24h). Without the
    // client-shape fields the dashboard never showed real stats.
    const snapshot = {
      total: 42,
      today: 5,
      lastHour: 1,
      failedActions: 2,
      topRules: [{ ruleKey: 'spam-removal / crypto', count: 3 }],
      computedAt: Date.now(),
      actionsToday: 5,
      timeSavedMin: 20,
      activeRules: 3,
      topRule: 'spam-removal / crypto',
      hourlyActions24h: new Array(24).fill(0),
    };
    readStatsSnapshot.mockResolvedValueOnce(snapshot);
    const res = await getJson('/stats');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { counters: typeof snapshot };
    expect(body.counters.total).toBe(42);
    // Polish #38: client-shape fields land on the wire
    expect(body.counters.actionsToday).toBe(5);
    expect(body.counters.timeSavedMin).toBe(20);
    expect(body.counters.activeRules).toBe(3);
    expect(body.counters.topRule).toBe('spam-removal / crypto');
    expect(Array.isArray(body.counters.hourlyActions24h)).toBe(true);
    expect(readStatsSnapshot).toHaveBeenCalledWith('r_test');
  });

  it('Polish #135: requireModerator transient 503 propagates', async () => {
    requireModeratorMock.mockResolvedValue({
      ok: false as const,
      status: 503 as const,
      error: 'mod check transient failure (retry in ~30s): ETIMEDOUT',
    });
    const res = await getJson('/stats');
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/transient/i);
    expect(readStatsSnapshot).not.toHaveBeenCalled();
  });

  // AE Polish #93: Polish #68 wrap for /api/stats had no test (only
  // sibling getCurrentSubreddit path was covered).
  it('Polish #68: 503 + structured body when readStatsSnapshot throws synchronously', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    readStatsSnapshot.mockImplementationOnce(() => {
      throw new Error('sync boom — fallback compute hit unexpected state');
    });
    const res = await getJson('/stats');
    expect(res.status).toBe(503);
    const body = (await res.json()) as { counters: unknown; error: string };
    expect(body.error).toMatch(/stats unavailable/i);
    expect(body.error).toContain('sync boom');
    expect(body.counters).toEqual({});
  });
});

describe('GET /api/health happy path (Polish #27)', () => {
  it('returns 200 w/ {ok, name, version, ts} (no auth, no Redis)', async () => {
    const res = await getJson('/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      name: string;
      version: string;
      ts: number;
    };
    expect(body.ok).toBe(true);
    expect(body.name).toBe('cm-devvit');
    expect(typeof body.version).toBe('string');
    expect(typeof body.ts).toBe('number');
    expect(body.ts).toBeGreaterThan(0);
    // Critical: liveness probe MUST NOT call requireModerator or Redis.
    expect(requireModeratorMock).not.toHaveBeenCalled();
    expect(getCurrentSubreddit).not.toHaveBeenCalled();
  });
});
