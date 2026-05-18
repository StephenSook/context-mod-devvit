/**
 * AE CRITICAL #8 — regression suite for GET /api/health/deep.
 *
 * The v0.5.3 (a45c0fb) requireModerator gate is the only thing keeping
 * unauthenticated callers from amplifying Redis writes on every probe.
 * Without coverage, a future "remove auth so monitors work" refactor
 * lands silently. Pins:
 *   - non-mod → 403
 *   - rate-limit cap (60/min) → 429
 *   - Redis throw → per-check err in 503 envelope (ok=false)
 *   - Reddit throw → per-check err in 503 envelope (ok=false)
 *   - happy path → 200 + {ok, name, version, ts, checks:{redis,reddit}}
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireModeratorMock = vi.fn();
const checkRateLimit = vi.fn();
const redisSet = vi.fn();
const redisGet = vi.fn();
const getCurrentSubreddit = vi.fn();

vi.mock('@devvit/web/server', () => ({
  reddit: { getCurrentSubreddit: () => getCurrentSubreddit() },
  redis: {
    set: (...a: unknown[]) => redisSet(...a),
    get: (...a: unknown[]) => redisGet(...a),
  },
  settings: { get: vi.fn() },
}));
vi.mock('../../src/lib/requireModerator', () => ({
  requireModerator: () => requireModeratorMock(),
}));
vi.mock('../../src/lib/ratelimit', () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimit(...a),
}));
vi.mock('../../src/lib/circuitBreaker', () => ({
  checkCircuit: vi.fn().mockResolvedValue({ state: 'closed' }),
  recordFailure: vi.fn(),
  recordSuccess: vi.fn(),
}));
vi.mock('../../src/state/muteSet', () => ({
  muteRule: vi.fn(),
  unmuteRule: vi.fn(),
  listMutedRules: vi.fn(),
}));
vi.mock('../../src/state/modActivity', () => ({
  logModActivity: vi.fn(),
  readModActivity: vi.fn(),
}));
vi.mock('../../src/state/configStore', () => ({
  getRecentRevs: vi.fn(),
}));
vi.mock('../../src/state/recentEvents', () => ({
  readRecent: vi.fn(),
}));
vi.mock('../../src/core/explainEvent', () => ({
  explainEvent: vi.fn(),
  validateEventSummary: vi.fn(),
}));
vi.mock('../../src/state/apiKeyStore', () => ({
  getOpenaiKey: vi.fn(),
}));
vi.mock('../../src/state/statsRollup', () => ({
  readStatsSnapshot: vi.fn(),
}));

import { api } from '../../src/routes/api';

const NON_MOD = {
  ok: false as const,
  status: 403 as const,
  error: 'not a moderator of this sub',
};
const AS_MOD = { ok: true as const, sub: 'r_test', username: 'mod_alice' };

async function getJson(path: string): Promise<Response> {
  return api.request(new Request(`http://x${path}`));
}

beforeEach(() => {
  vi.clearAllMocks();
  checkRateLimit.mockResolvedValue({
    allowed: true,
    count: 1,
    max: 60,
    resetInSec: 60,
  });
});

describe('GET /api/health/deep (AE CRITICAL #8)', () => {
  it('rejects non-mod with 403 and does NOT touch Redis or Reddit', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const res = await getJson('/health/deep');
    expect(res.status).toBe(403);
    expect(redisSet).not.toHaveBeenCalled();
    expect(redisGet).not.toHaveBeenCalled();
    expect(getCurrentSubreddit).not.toHaveBeenCalled();
  });

  it('rejects mod with 429 when rate-limit exhausted (60/min cap)', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    checkRateLimit.mockResolvedValue({
      allowed: false,
      count: 61,
      max: 60,
      resetInSec: 30,
    });
    const res = await getJson('/health/deep');
    expect(res.status).toBe(429);
    expect(redisSet).not.toHaveBeenCalled();
    expect(getCurrentSubreddit).not.toHaveBeenCalled();
  });

  it('happy path: returns 200 with both checks ok + version + ts envelope', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    let storedValue: string | undefined;
    redisSet.mockImplementation(async (_k: string, v: string) => {
      storedValue = v;
      return 'OK';
    });
    redisGet.mockImplementation(async () => storedValue);
    getCurrentSubreddit.mockResolvedValue({ name: 'r_test' });
    const res = await getJson('/health/deep');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      name: string;
      ts: number;
      checks: {
        redis: { ok: boolean; latencyMs: number };
        reddit: { ok: boolean; latencyMs: number; sub?: string };
      };
    };
    expect(body.ok).toBe(true);
    expect(body.name).toBe('cm-devvit');
    expect(typeof body.ts).toBe('number');
    expect(body.checks.redis.ok).toBe(true);
    expect(typeof body.checks.redis.latencyMs).toBe('number');
    expect(body.checks.reddit.ok).toBe(true);
    expect(body.checks.reddit.sub).toBe('r_test');
  });

  it('Redis throw → 503 with redis.ok=false + err message, reddit still attempted', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    redisSet.mockRejectedValue(new Error('redis offline'));
    getCurrentSubreddit.mockResolvedValue({ name: 'r_test' });
    const res = await getJson('/health/deep');
    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      ok: boolean;
      checks: {
        redis: { ok: boolean; err?: string };
        reddit: { ok: boolean };
      };
    };
    expect(body.ok).toBe(false);
    expect(body.checks.redis.ok).toBe(false);
    expect(body.checks.redis.err).toContain('redis offline');
    expect(body.checks.reddit.ok).toBe(true);
  });

  it('Reddit throw → 503 with reddit.ok=false + err message, redis still ok', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    let storedValue: string | undefined;
    redisSet.mockImplementation(async (_k: string, v: string) => {
      storedValue = v;
      return 'OK';
    });
    redisGet.mockImplementation(async () => storedValue);
    getCurrentSubreddit.mockRejectedValue(new Error('reddit context lost'));
    const res = await getJson('/health/deep');
    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      ok: boolean;
      checks: {
        redis: { ok: boolean };
        reddit: { ok: boolean; err?: string };
      };
    };
    expect(body.ok).toBe(false);
    expect(body.checks.redis.ok).toBe(true);
    expect(body.checks.reddit.ok).toBe(false);
    expect(body.checks.reddit.err).toContain('reddit context lost');
  });

  it('Redis set succeeds but get returns mismatched value → redis.ok=false', async () => {
    // Defends the "echo === String(ts)" check at api.ts:357 — covers the
    // case where Redis is up but returning stale/wrong data (rare but
    // possible during a failover).
    requireModeratorMock.mockResolvedValue(AS_MOD);
    redisSet.mockResolvedValue('OK');
    redisGet.mockResolvedValue('different-value');
    getCurrentSubreddit.mockResolvedValue({ name: 'r_test' });
    const res = await getJson('/health/deep');
    const body = (await res.json()) as {
      ok: boolean;
      checks: { redis: { ok: boolean } };
    };
    expect(body.ok).toBe(false);
    expect(body.checks.redis.ok).toBe(false);
    expect(res.status).toBe(503);
  });
});
