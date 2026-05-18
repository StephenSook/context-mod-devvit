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

vi.mock('@devvit/web/server', () => ({
  reddit: { getCurrentSubreddit: () => getCurrentSubreddit() },
  settings: { get: (k: string) => settingsGet(k) },
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

import { api } from '../../src/routes/api';

const NON_MOD = { ok: false as const, status: 403 as const, error: 'not a moderator of this sub' };
const AS_MOD = { ok: true as const, sub: 'r_test', username: 'mod_alice' };

beforeEach(() => {
  vi.clearAllMocks();
  validateEventSummary.mockImplementation((event: unknown) => ({ ok: true, event }));
  checkRateLimit.mockResolvedValue({ allowed: true, count: 1, max: 30, resetInSec: 3600 });
  checkCircuit.mockResolvedValue({ state: 'closed' });
  recordFailure.mockResolvedValue(undefined);
  recordSuccess.mockResolvedValue(undefined);
});

async function postJson(path: string, body: unknown): Promise<Response> {
  return api.request(new Request(`http://x${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

async function getJson(path: string): Promise<Response> {
  return api.request(new Request(`http://x${path}`));
}

describe('POST /api/mute-rule (W8)', () => {
  it('rejects non-mod with 403 and does NOT call muteRule', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const res = await postJson('/mute-rule', { runName: 'spam', checkName: 'crypto' });
    expect(res.status).toBe(403);
    expect(muteRule).not.toHaveBeenCalled();
    expect(logModActivity).not.toHaveBeenCalled();
  });

  it('allows mod + logs activity with auth.username (not body) — prevents log spoofing', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    muteRule.mockResolvedValue({ ok: true });
    const res = await postJson('/mute-rule', { runName: 'spam', checkName: 'crypto', actor: 'evil_user' });
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
    const res = await postJson('/unmute-rule', { runName: 'spam', checkName: 'crypto' });
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
    validateEventSummary.mockReturnValueOnce({ ok: false, error: 'matchedSubstring exceeds 200 chars' });
    const res = await postJson('/explain-event', { event: { matchedSubstring: 'x' } });
    expect(res.status).toBe(400);
    expect(explainEvent).not.toHaveBeenCalled();
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it('X1 returns 429 when rate-limit denies', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    checkRateLimit.mockResolvedValueOnce({ allowed: false, count: 31, max: 30, resetInSec: 1800 });
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

  it('X37 records success when explainEvent returns ok', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    getOpenaiKey.mockResolvedValue('sk-x');
    explainEvent.mockResolvedValue({ ok: true, explanation: 'why' });
    await postJson('/explain-event', { event: { kind: 'remove' } });
    expect(recordSuccess).toHaveBeenCalledWith('openai');
    expect(recordFailure).not.toHaveBeenCalled();
  });

  it('X37 records failure when explainEvent returns error', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    getOpenaiKey.mockResolvedValue('sk-x');
    explainEvent.mockResolvedValue({ ok: false, error: 'OpenAI 500' });
    await postJson('/explain-event', { event: { kind: 'remove' } });
    expect(recordFailure).toHaveBeenCalledWith('openai');
    expect(recordSuccess).not.toHaveBeenCalled();
  });

  it('prefers Redis key over Devvit setting when both present', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    getOpenaiKey.mockResolvedValue('sk-redis-key');
    settingsGet.mockResolvedValue('sk-settings-key');
    explainEvent.mockResolvedValue({ ok: true, explanation: 'because spam' });
    const res = await postJson('/explain-event', { event: { kind: 'remove' } });
    expect(res.status).toBe(200);
    expect(explainEvent).toHaveBeenCalledWith({ kind: 'remove' }, 'sk-redis-key');
  });

  it('falls back to Devvit setting when Redis returns null', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    getOpenaiKey.mockResolvedValue(null);
    settingsGet.mockResolvedValue('sk-settings-key');
    explainEvent.mockResolvedValue({ ok: true, explanation: 'because spam' });
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
});
