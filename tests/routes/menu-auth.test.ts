/**
 * App Review mod-permission regression (2026-06-07).
 *
 * Reddit App Review rejected cm-devvit 0.3.0: "Any mod-only actions should
 * check for proper mod perms before allowing the action to be submitted."
 * The /internal/menu/* handlers previously relied ONLY on the menu item's
 * `forUserType: "moderator"` — but the handler endpoints are HTTP-reachable
 * by any viewer of the Observatory custom post (same reachability the
 * /api/* + form-submit handlers already defend against). These tests pin a
 * server-side requireModerator() gate on every menu handler so a future
 * refactor that drops one breaks CI.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireModeratorMock = vi.fn();
const loadFromWiki = vi.fn();
const publish = vi.fn();
const submitCustomPost = vi.fn();
const getPostById = vi.fn();
const removePost = vi.fn();
const getCurrentSubreddit = vi.fn(async () => ({ name: 'r_test' }));
const getCurrentUser = vi.fn(async () => ({ username: 'mod_alice' }));
const logModActivity = vi.fn();
const redisSet = vi.fn();
const redisGet = vi.fn();

vi.mock('@devvit/web/server', () => ({
  reddit: {
    getCurrentSubreddit: () => getCurrentSubreddit(),
    getCurrentUser: () => getCurrentUser(),
    submitCustomPost: (...a: unknown[]) => submitCustomPost(...a),
    getPostById: (...a: unknown[]) => getPostById(...a),
    remove: (...a: unknown[]) => removePost(...a),
  },
  redis: {
    set: (...a: unknown[]) => redisSet(...a),
    get: (...a: unknown[]) => redisGet(...a),
  },
}));
vi.mock('../../src/lib/requireModerator', () => ({
  requireModerator: () => requireModeratorMock(),
}));
vi.mock('../../src/core/configSource', () => ({
  loadFromWiki: (...a: unknown[]) => loadFromWiki(...a),
  WIKI_PAGE: 'botconfig/contextmod',
}));
vi.mock('../../src/state/configStore', () => ({
  publish: (...a: unknown[]) => publish(...a),
}));
vi.mock('../../src/state/modActivity', () => ({
  logModActivity: (...a: unknown[]) => logModActivity(...a),
}));
vi.mock('../../src/state/keys', () => ({
  K: {
    cfgLastWikiRev: (sub: string) => `cm:cfg:lastwiki:${sub}`,
    dashboardPostId: (sub: string) => `cm:dash:${sub}`,
  },
}));

import { menu } from '../../src/routes/menu';

const NON_MOD = { ok: false as const, status: 403 as const, error: 'not a moderator of this sub' };
const TRANSIENT = {
  ok: false as const,
  status: 503 as const,
  error: 'mod check transient failure (retry in ~30s): ECONNRESET',
};
const AS_MOD = { ok: true as const, sub: 'r_test', username: 'mod_alice' };

const ALL_ENDPOINTS = [
  '/reload-config',
  '/recent-actions',
  '/set-openai-key',
  '/explain-rule',
  '/simulate-rule',
  '/test-rules',
];

async function postMenu(path: string, body: unknown = {}): Promise<Response> {
  return menu.request(
    new Request(`http://x${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentSubreddit.mockResolvedValue({ name: 'r_test' });
  getCurrentUser.mockResolvedValue({ username: 'mod_alice' });
  // Default: no stored dashboard post, so recent-actions takes the create path.
  redisGet.mockResolvedValue(null);
});

describe('mod-menu handlers reject non-mods (App Review fix 2026-06-07)', () => {
  for (const path of ALL_ENDPOINTS) {
    it(`${path}: non-mod → 200 UiResponse with a mod-only toast, never a form/navigate`, async () => {
      requireModeratorMock.mockResolvedValue(NON_MOD);
      const res = await postMenu(path);
      // Menu handlers return a 200 UiResponse; the rejection is surfaced as a
      // toast (Devvit's contract), and crucially the action never executes.
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        showToast?: string;
        showForm?: unknown;
        navigateTo?: string;
      };
      expect(json.showToast).toMatch(/mod-only/i);
      expect(json.showForm).toBeUndefined();
      expect(json.navigateTo).toBeUndefined();
    });

    it(`${path}: transient mod-check (503) → retry toast, NOT a permission denial`, async () => {
      requireModeratorMock.mockResolvedValue(TRANSIENT);
      const res = await postMenu(path);
      const json = (await res.json()) as { showToast?: string };
      expect(json.showToast).toMatch(/temporarily unavailable|retry/i);
      expect(json.showToast).not.toMatch(/mod-only/i);
    });
  }

  it('reload-config: a non-mod never reads the wiki or publishes config', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    await postMenu('/reload-config');
    expect(loadFromWiki).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
    expect(redisSet).not.toHaveBeenCalled();
  });

  it('recent-actions: a non-mod never creates a custom post', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    await postMenu('/recent-actions');
    expect(submitCustomPost).not.toHaveBeenCalled();
  });
});

describe('mod-menu handlers allow mods (happy path stays intact)', () => {
  it('reload-config: a mod triggers loadFromWiki + publish, gets a rule-count toast', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    loadFromWiki.mockResolvedValue({
      ok: true,
      config: { runs: [{ checks: [{ rules: [{}, {}] }] }] },
      revisionId: 'rev9',
    });
    publish.mockResolvedValue(7);
    const res = await postMenu('/reload-config');
    expect(res.status).toBe(200);
    const json = (await res.json()) as { showToast: string };
    expect(loadFromWiki).toHaveBeenCalledWith('r_test');
    expect(publish).toHaveBeenCalledWith({ runs: [{ checks: [{ rules: [{}, {}] }] }] }, 'r_test');
    expect(json.showToast).toMatch(/Loaded 2 rules \(rev 7\)/);
  });

  it('recent-actions: a mod creates the Observatory post + gets a navigateTo', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    submitCustomPost.mockResolvedValue({ id: 't3_post', permalink: '/r/r_test/comments/x/' });
    const res = await postMenu('/recent-actions');
    expect(res.status).toBe(200);
    const json = (await res.json()) as { navigateTo?: string };
    expect(submitCustomPost).toHaveBeenCalledWith(
      expect.objectContaining({ subredditName: 'r_test', entry: 'default' })
    );
    expect(json.navigateTo).toContain('/r/r_test/comments/x/');
  });

  it('recent-actions: a new post is created with a splash, removed from the feed, and its id stored', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    redisGet.mockResolvedValue(null);
    submitCustomPost.mockResolvedValue({ id: 't3_new', permalink: '/r/r_test/comments/new/' });
    await postMenu('/recent-actions');
    // created with a splash cover (SampleOfNone 2026-06-09)
    expect(submitCustomPost).toHaveBeenCalledWith(
      expect.objectContaining({
        entry: 'default',
        splash: expect.objectContaining({ appDisplayName: 'ContextMod Observatory' }),
      })
    );
    // removed from the public feed immediately
    expect(removePost).toHaveBeenCalledWith('t3_new', false);
    // id persisted for reuse
    expect(redisSet).toHaveBeenCalledWith('cm:dash:r_test', 't3_new');
  });

  it('recent-actions: reuses the existing dashboard post instead of creating a new one', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    redisGet.mockResolvedValue('t3_existing');
    getPostById.mockResolvedValue({ id: 't3_existing', permalink: '/r/r_test/comments/old/' });
    const res = await postMenu('/recent-actions');
    const json = (await res.json()) as { navigateTo?: string };
    expect(getPostById).toHaveBeenCalledWith('t3_existing');
    expect(submitCustomPost).not.toHaveBeenCalled();
    expect(removePost).not.toHaveBeenCalled();
    expect(json.navigateTo).toContain('/r/r_test/comments/old/');
  });

  it('recent-actions: recreates the post when the stored id is gone', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    redisGet.mockResolvedValue('t3_gone');
    getPostById.mockRejectedValue(new Error('404 not found'));
    submitCustomPost.mockResolvedValue({ id: 't3_fresh', permalink: '/r/r_test/comments/fresh/' });
    const res = await postMenu('/recent-actions');
    const json = (await res.json()) as { navigateTo?: string };
    expect(submitCustomPost).toHaveBeenCalledTimes(1);
    expect(removePost).toHaveBeenCalledWith('t3_fresh', false);
    expect(redisSet).toHaveBeenCalledWith('cm:dash:r_test', 't3_fresh');
    expect(json.navigateTo).toContain('/r/r_test/comments/fresh/');
  });

  it('recent-actions: a remove failure still returns the dashboard link (best-effort)', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    redisGet.mockResolvedValue(null);
    submitCustomPost.mockResolvedValue({ id: 't3_x', permalink: '/r/r_test/comments/x/' });
    removePost.mockRejectedValue(new Error('remove blew up'));
    const res = await postMenu('/recent-actions');
    const json = (await res.json()) as { navigateTo?: string };
    expect(redisSet).toHaveBeenCalledWith('cm:dash:r_test', 't3_x');
    expect(json.navigateTo).toContain('/r/r_test/comments/x/');
  });

  it('set-openai-key: a mod sees the form', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    const res = await postMenu('/set-openai-key');
    const json = (await res.json()) as { showForm?: { name: string } };
    expect(json.showForm?.name).toBe('setOpenaiKey');
  });

  it('test-rules: a mod with a targetId sees the dry-run form', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    const res = await postMenu('/test-rules', { targetId: 't3_abc' });
    const json = (await res.json()) as { showForm?: { name: string } };
    expect(json.showForm?.name).toBe('testRules');
  });
});
