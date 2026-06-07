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
const getCurrentSubreddit = vi.fn(async () => ({ name: 'r_test' }));
const getCurrentUser = vi.fn(async () => ({ username: 'mod_alice' }));
const logModActivity = vi.fn();
const redisSet = vi.fn();

vi.mock('@devvit/web/server', () => ({
  reddit: {
    getCurrentSubreddit: () => getCurrentSubreddit(),
    getCurrentUser: () => getCurrentUser(),
    submitCustomPost: (...a: unknown[]) => submitCustomPost(...a),
  },
  redis: { set: (...a: unknown[]) => redisSet(...a) },
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
  K: { cfgLastWikiRev: (sub: string) => `cm:cfg:lastwiki:${sub}` },
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
