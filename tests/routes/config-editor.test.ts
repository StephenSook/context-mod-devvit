import { describe, it, expect, vi, beforeEach } from 'vitest';

const getWikiPage = vi.fn();
const requireModeratorMock = vi.fn();
vi.mock('@devvit/web/server', () => ({
  reddit: { getWikiPage: (s: string, p: string) => getWikiPage(s, p), updateWikiPage: vi.fn() },
  redis: { get: vi.fn(async () => null), set: vi.fn(async () => 'OK') },
  settings: { get: vi.fn() },
}));
vi.mock('../../src/lib/requireModerator', () => ({ requireModerator: () => requireModeratorMock() }));

import { configEditor } from '../../src/routes/configEditor';

const MOD = { ok: true, sub: 'testsub', username: 'mod1' };
const NON_MOD = { ok: false, status: 403, error: 'not a moderator of this sub' };

async function get(path: string) {
  const res = await configEditor.request(new Request(`http://x${path}`));
  return { status: res.status, body: await res.json() };
}

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
