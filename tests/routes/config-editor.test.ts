import { describe, it, expect, vi, beforeEach } from 'vitest';

const getWikiPage = vi.fn();
const updateWikiPage = vi.fn();
const requireModeratorMock = vi.fn();
const getRecentSample = vi.fn();
const simulateRule = vi.fn();
const explainRule = vi.fn();
const resolveOpenaiKey = vi.fn();
const publish = vi.fn();
const logModActivity = vi.fn();

// Named redis fn handles so individual tests can override per-call behavior.
const redisGet = vi.fn(async () => null);
const redisSet = vi.fn(async () => 'OK');
const redisIncrBy = vi.fn(async () => 1);
const redisExpire = vi.fn(async () => undefined);

vi.mock('@devvit/web/server', () => ({
  reddit: {
    getWikiPage: (s: string, p: string) => getWikiPage(s, p),
    updateWikiPage: (o: unknown) => updateWikiPage(o),
  },
  redis: {
    get: (...args: unknown[]) => redisGet(...args),
    set: (...args: unknown[]) => redisSet(...args),
    incrBy: (...args: unknown[]) => redisIncrBy(...args),
    expire: (...args: unknown[]) => redisExpire(...args),
  },
  settings: { get: vi.fn() },
}));
vi.mock('../../src/lib/requireModerator', () => ({ requireModerator: () => requireModeratorMock() }));
vi.mock('../../src/core/recentSample', () => ({ getRecentSample: (s: string) => getRecentSample(s) }));
vi.mock('../../src/core/simulateRule', () => ({ simulateRule: (...a: unknown[]) => simulateRule(...a) }));
vi.mock('../../src/core/explainRule', () => ({ explainRule: (...a: unknown[]) => explainRule(...a) }));
vi.mock('../../src/lib/resolveOpenaiKey', () => ({ resolveOpenaiKey: (s: string) => resolveOpenaiKey(s) }));
vi.mock('../../src/state/configStore', () => ({
  publish: (...a: unknown[]) => publish(...a),
  getCurrentRev: vi.fn(),
  getRecentRevs: vi.fn(),
}));
vi.mock('../../src/state/modActivity', () => ({
  logModActivity: (...a: unknown[]) => logModActivity(...a),
}));

import { configEditor } from '../../src/routes/configEditor';

const MOD = { ok: true, sub: 'testsub', username: 'mod1' };
const NON_MOD = { ok: false, status: 403, error: 'not a moderator of this sub' };

async function get(path: string) {
  const res = await configEditor.request(new Request(`http://x${path}`));
  return { status: res.status, body: await res.json() };
}

async function post(path: string, body: unknown) {
  const res = await configEditor.request(new Request(`http://x${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
  return { status: res.status, body: await res.json() };
}

describe('POST /validate', () => {
  beforeEach(() => { requireModeratorMock.mockResolvedValue(MOD); });
  it('accepts a valid config', async () => {
    const r = await post('/validate', { text: 'runs: []' });
    expect(r.body.ok).toBe(true);
  });
  it('reports errors for an invalid config', async () => {
    const r = await post('/validate', { text: 'runs:\n  kind: badvalue' });
    expect(r.body.ok).toBe(false);
    expect(r.body.errors).toBeDefined();
  });
  it('rejects non-mods with 403', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const r = await post('/validate', { text: 'runs: []' });
    expect(r.status).toBe(403);
    expect(r.body.ok).toBe(false);
  });
});

describe('POST /simulate-live', () => {
  beforeEach(() => {
    requireModeratorMock.mockResolvedValue(MOD);
    getRecentSample.mockResolvedValue([]);
    // Default: incrBy returns 1 (well under 120 cap) — allowed.
    redisIncrBy.mockResolvedValue(1);
  });

  it('returns the simulation result', async () => {
    simulateRule.mockResolvedValue({ ok: true, totalSamples: 25, firedCount: 7, erroredCount: 0, breakdown: [] });
    const r = await post('/simulate-live', { text: 'runs: []' });
    expect(r.body).toMatchObject({ ok: true, firedCount: 7, totalSamples: 25 });
  });

  it('returns 400 when text is missing', async () => {
    const r = await post('/simulate-live', {});
    expect(r.status).toBe(400);
    expect(r.body.ok).toBe(false);
  });

  it('returns 429 when rate-limited (incrBy exceeds cap of 120)', async () => {
    // checkRateLimit: allowed = count <= max; 121 > 120, so allowed = false.
    redisIncrBy.mockResolvedValueOnce(121);
    const r = await post('/simulate-live', { text: 'runs: []' });
    expect(r.status).toBe(429);
    expect(r.body.ok).toBe(false);
  });

  it('returns 503 when getRecentSample throws', async () => {
    getRecentSample.mockRejectedValueOnce(new Error('Redis timeout'));
    simulateRule.mockResolvedValue({ ok: true, totalSamples: 0, firedCount: 0, erroredCount: 0, breakdown: [] });
    const r = await post('/simulate-live', { text: 'runs: []' });
    expect(r.status).toBe(503);
    expect(r.body.ok).toBe(false);
    expect(r.body.error).toMatch(/Simulation unavailable/);
  });
});

describe('POST /explain', () => {
  beforeEach(() => {
    requireModeratorMock.mockResolvedValue(MOD);
    resolveOpenaiKey.mockResolvedValue('sk-x');
    // Default: incrBy returns 1 (under 10 cap) — allowed, not degraded.
    redisIncrBy.mockResolvedValue(1);
  });

  it('returns the explanation', async () => {
    explainRule.mockResolvedValue({ ok: true, value: 'This rule removes crypto spam.' });
    const r = await post('/explain', { text: 'runs: []' });
    expect(r.body).toMatchObject({ ok: true, explanation: 'This rule removes crypto spam.' });
  });

  it('returns 400 when text is missing', async () => {
    const r = await post('/explain', {});
    expect(r.status).toBe(400);
    expect(r.body.ok).toBe(false);
  });

  it('returns 400 when no OpenAI key is set', async () => {
    resolveOpenaiKey.mockResolvedValueOnce('');
    explainRule.mockResolvedValue({ ok: true, value: 'irrelevant' });
    const r = await post('/explain', { text: 'runs: []' });
    expect(r.status).toBe(400);
    expect(r.body.ok).toBe(false);
    expect(r.body.error).toMatch(/No OpenAI key/);
  });

  it('returns 503 when rate-limit subsystem is degraded (incrBy throws)', async () => {
    // checkRateLimit catches the throw and returns { allowed: true, degraded: true }.
    // The /explain handler checks rl.degraded before rl.allowed and returns 503.
    redisIncrBy.mockRejectedValueOnce(new Error('Redis connection refused'));
    const r = await post('/explain', { text: 'runs: []' });
    expect(r.status).toBe(503);
    expect(r.body.ok).toBe(false);
    expect(r.body.error).toMatch(/degraded/i);
  });

  it('returns 429 when rate-limited (incrBy exceeds cap of 10)', async () => {
    // checkRateLimit: allowed = count <= max; 11 > 10, so allowed = false.
    redisIncrBy.mockResolvedValueOnce(11);
    const r = await post('/explain', { text: 'runs: []' });
    expect(r.status).toBe(429);
    expect(r.body.ok).toBe(false);
    expect(r.body.error).toMatch(/limit/i);
  });

  it('returns 500 when explainRule returns {ok: false}', async () => {
    explainRule.mockResolvedValueOnce({ ok: false, error: 'OpenAI returned 500' });
    const r = await post('/explain', { text: 'runs: []' });
    expect(r.status).toBe(500);
    expect(r.body.ok).toBe(false);
  });
});

describe('GET /raw', () => {
  beforeEach(() => { getWikiPage.mockReset(); requireModeratorMock.mockReset(); });

  it('returns wiki content + revisionId for a mod', async () => {
    requireModeratorMock.mockResolvedValue(MOD);
    getWikiPage.mockResolvedValue({ content: 'runs: []', revisionId: 'rev-1' });
    const r = await get('/raw');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ content: 'runs: []', revisionId: 'rev-1', isDefaultTemplate: false });
  });

  it('rejects non-mods', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const r = await get('/raw');
    expect(r.status).toBe(403);
  });

  it('returns the default template on a missing page', async () => {
    requireModeratorMock.mockResolvedValue(MOD);
    getWikiPage.mockRejectedValue(new Error('404 not found'));
    const r = await get('/raw');
    expect(r.status).toBe(200);
    expect(r.body.isDefaultTemplate).toBe(true);
    expect(typeof r.body.content).toBe('string');
  });

  it('returns 503 on a non-404 wiki error', async () => {
    requireModeratorMock.mockResolvedValue(MOD);
    getWikiPage.mockRejectedValue(new Error('internal error'));
    const r = await get('/raw');
    expect(r.status).toBe(503);
  });
});

describe('POST /save', () => {
  beforeEach(() => {
    requireModeratorMock.mockResolvedValue(MOD);
    updateWikiPage.mockReset();
    publish.mockReset();
    getWikiPage.mockReset();
    logModActivity.mockReset();
  });

  it('rejects an invalid config without writing', async () => {
    const r = await post('/save', { text: 'runs: "bad"', baseRevisionId: 'rev-1' });
    expect(r.status).toBe(400);
    expect(updateWikiPage).not.toHaveBeenCalled();
  });

  it('409s when the wiki moved since load', async () => {
    getWikiPage.mockResolvedValue({ content: 'runs: []', revisionId: 'rev-2' });
    const r = await post('/save', { text: 'runs: []', baseRevisionId: 'rev-1' });
    expect(r.status).toBe(409);
    expect(updateWikiPage).not.toHaveBeenCalled();
  });

  it('saves a valid config and publishes', async () => {
    getWikiPage.mockResolvedValue({ content: 'old', revisionId: 'rev-1' });
    updateWikiPage.mockResolvedValue({ revisionId: 'rev-2' });
    publish.mockResolvedValue(0);
    const r = await post('/save', { text: 'runs: []', baseRevisionId: 'rev-1' });
    expect(r.status).toBe(200);
    expect(updateWikiPage).toHaveBeenCalledOnce();
    expect(publish).toHaveBeenCalledOnce();
    expect(r.body).toMatchObject({ ok: true, rev: 0, ruleCount: 0 });
  });
});
