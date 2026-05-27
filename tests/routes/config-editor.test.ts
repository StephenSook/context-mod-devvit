import { describe, it, expect, vi, beforeEach } from 'vitest';

const getWikiPage = vi.fn();
const requireModeratorMock = vi.fn();
const getRecentSample = vi.fn();
const simulateRule = vi.fn();
const explainRule = vi.fn();
const resolveOpenaiKey = vi.fn();
vi.mock('@devvit/web/server', () => ({
  reddit: { getWikiPage: (s: string, p: string) => getWikiPage(s, p), updateWikiPage: vi.fn() },
  redis: { get: vi.fn(async () => null), set: vi.fn(async () => 'OK'), incrBy: vi.fn(async () => 1), expire: vi.fn(async () => undefined) },
  settings: { get: vi.fn() },
}));
vi.mock('../../src/lib/requireModerator', () => ({ requireModerator: () => requireModeratorMock() }));
vi.mock('../../src/core/recentSample', () => ({ getRecentSample: (s: string) => getRecentSample(s) }));
vi.mock('../../src/core/simulateRule', () => ({ simulateRule: (...a: unknown[]) => simulateRule(...a) }));
vi.mock('../../src/core/explainRule', () => ({ explainRule: (...a: unknown[]) => explainRule(...a) }));
vi.mock('../../src/lib/resolveOpenaiKey', () => ({ resolveOpenaiKey: (s: string) => resolveOpenaiKey(s) }));

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
