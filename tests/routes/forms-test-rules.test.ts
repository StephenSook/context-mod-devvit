/**
 * Step 3.6 form handler — Codex H1 fix verified: routes through
 * normalizePost / normalizeComment + reads configStore.getCurrentRev so
 * author enrichment matches live moderation behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const dryRunActivity = vi.fn();
const normalizePost = vi.fn();
const normalizeComment = vi.fn();
const getCurrentRev = vi.fn();
const getCurrentSubreddit = vi.fn(async () => ({ name: 'r_test' }));
const getPostById = vi.fn();
const getCommentById = vi.fn();
const requireModeratorMock = vi.fn(async () => ({
  ok: true,
  sub: 'r_test',
  username: 'mod_alice',
}));

vi.mock('@devvit/web/server', () => ({
  reddit: {
    getCurrentSubreddit: () => getCurrentSubreddit(),
    getPostById: (id: string) => getPostById(id),
    getCommentById: (id: string) => getCommentById(id),
  },
  redis: {},
  settings: { get: async () => '' },
}));
vi.mock('../../src/lib/requireModerator', () => ({
  requireModerator: () => requireModeratorMock(),
}));
vi.mock('../../src/core/dryRunActivity', () => ({
  dryRunActivity: (...a: unknown[]) => dryRunActivity(...a),
}));
vi.mock('../../src/shared/normalize', () => ({
  normalizePost: (...a: unknown[]) => normalizePost(...a),
  normalizeComment: (...a: unknown[]) => normalizeComment(...a),
}));
vi.mock('../../src/state/configStore', () => ({
  getCurrentRev: (...a: unknown[]) => getCurrentRev(...a),
}));

import { forms } from '../../src/routes/forms';

const baseItem = {
  id: 't3_abc',
  title: 'free crypto giveaway',
  body: '',
  url: '',
  author: 'spammer',
  age: 60,
  score: 0,
  isSelf: true,
  over18: false,
  removed: false,
  approved: false,
  locked: false,
  stickied: false,
  linkFlairText: null,
};
const baseAuthor = {
  name: 'spammer',
  id: 't2_x',
  age: 86400,
  linkKarma: 0,
  commentKarma: 0,
  flairText: null,
  isMod: false,
  isContributor: false,
  verified: false,
  shadowBanned: false,
};
const baseSafe = {
  authorName: 'spammer',
  itemTitle: 'free crypto giveaway',
  itemBody: '',
};

beforeEach(() => {
  dryRunActivity.mockReset();
  normalizePost.mockReset();
  normalizeComment.mockReset();
  getCurrentRev.mockReset();
  getPostById.mockReset();
  getCommentById.mockReset();
  requireModeratorMock.mockReset();
  requireModeratorMock.mockResolvedValue({
    ok: true,
    sub: 'r_test',
    username: 'mod_alice',
  });
  getCurrentRev.mockResolvedValue({
    rev: 1,
    config: { runs: [], needsAuthorEnrichment: false },
  });
  normalizePost.mockResolvedValue({
    item: baseItem,
    author: baseAuthor,
    safe: baseSafe,
  });
  normalizeComment.mockResolvedValue({
    item: { ...baseItem, id: 't1_xyz', title: '', body: 'a comment' },
    author: baseAuthor,
    safe: baseSafe,
  });
});

describe('POST /test-rules-submit form handler', () => {
  it('Codex H1 — routes post through normalizePost (live-parity enrichment)', async () => {
    getPostById.mockResolvedValueOnce({
      id: 't3_abc',
      title: 'free crypto giveaway',
      body: '',
      url: '',
      authorName: 'spammer',
      authorId: 't2_x',
    });
    dryRunActivity.mockResolvedValueOnce({
      configPresent: true,
      configRev: 1,
      runs: [
        {
          runName: 'spam-removal',
          triggered: true,
          checkName: 'crypto-giveaway',
          actions: [
            { kind: 'remove', wouldHaveCalled: 'remove' },
            { kind: 'comment', wouldHaveCalled: 'comment' },
          ],
        },
      ],
    });

    const req = new Request('http://x/test-rules-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { thingId: 't3_abc' } }),
    });
    const res = await forms.request(req);
    const json = (await res.json()) as { showToast: string };

    expect(getCurrentRev).toHaveBeenCalledWith('r_test');
    expect(normalizePost).toHaveBeenCalledTimes(1);
    expect(dryRunActivity).toHaveBeenCalledWith(baseItem, baseAuthor, 'r_test');
    expect(json.showToast).toContain('spam-removal');
    expect(json.showToast).toContain('crypto-giveaway');
    expect(json.showToast).toContain('remove');
    expect(json.showToast).toContain('comment');
  });

  it('reports no config when configPresent=false', async () => {
    getPostById.mockResolvedValueOnce({
      id: 't3_abc',
      title: '',
      body: '',
      url: '',
      authorName: 'x',
    });
    dryRunActivity.mockResolvedValueOnce({ configPresent: false, runs: [] });

    const req = new Request('http://x/test-rules-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { thingId: 't3_abc' } }),
    });
    const res = await forms.request(req);
    const json = (await res.json()) as { showToast: string };
    expect(json.showToast).toMatch(/no config/i);
  });

  it('reports no triggered runs as explicit pass', async () => {
    getPostById.mockResolvedValueOnce({
      id: 't3_abc',
      title: 'a poem',
      body: '',
      url: '',
      authorName: 'x',
    });
    dryRunActivity.mockResolvedValueOnce({
      configPresent: true,
      configRev: 1,
      runs: [{ runName: 'spam-removal', triggered: false, actions: [] }],
    });

    const req = new Request('http://x/test-rules-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { thingId: 't3_abc' } }),
    });
    const res = await forms.request(req);
    const json = (await res.json()) as { showToast: string };
    expect(json.showToast).toMatch(/no rules triggered/i);
  });

  it('W1 — rejects non-mod caller with showToast + does NOT call dryRunActivity', async () => {
    requireModeratorMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      error: 'not a moderator of this sub',
    });
    const req = new Request('http://x/test-rules-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { thingId: 't3_abc' } }),
    });
    const res = await forms.request(req);
    const json = (await res.json()) as { showToast: string };
    expect(json.showToast).toMatch(/mod-only/i);
    expect(dryRunActivity).not.toHaveBeenCalled();
    expect(getPostById).not.toHaveBeenCalled();
  });

  it('Polish #18 — 503 (transient mod-check) surfaces "retry" toast, not misleading "not a mod"', async () => {
    requireModeratorMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      error: 'mod check transient failure (retry in ~30s): fetch failed',
    });
    const req = new Request('http://x/test-rules-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { thingId: 't3_abc' } }),
    });
    const res = await forms.request(req);
    const json = (await res.json()) as { showToast: string };
    expect(json.showToast).toMatch(/temporarily unavailable/i);
    expect(json.showToast).toMatch(/retry/i);
    expect(json.showToast).not.toMatch(/mod-only/i);
    expect(dryRunActivity).not.toHaveBeenCalled();
  });

  it('Polish #18 — 500 (programming error) surfaces "see logs" toast, not "not a mod"', async () => {
    requireModeratorMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      error: 'mod check failed: TypeError: cannot read prop of undefined',
    });
    const req = new Request('http://x/test-rules-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { thingId: 't3_abc' } }),
    });
    const res = await forms.request(req);
    const json = (await res.json()) as { showToast: string };
    expect(json.showToast).toMatch(/see logs/i);
    expect(json.showToast).not.toMatch(/mod-only/i);
    expect(dryRunActivity).not.toHaveBeenCalled();
  });

  it('Codex H1 — routes comments through normalizeComment (live-parity enrichment)', async () => {
    getCommentById.mockResolvedValueOnce({
      id: 't1_xyz',
      body: 'a comment',
      authorName: 'u',
      authorId: 't2_u',
    });
    dryRunActivity.mockResolvedValueOnce({
      configPresent: true,
      configRev: 1,
      runs: [{ runName: 'spam', triggered: false, actions: [] }],
    });

    const req = new Request('http://x/test-rules-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { thingId: 't1_xyz' } }),
    });
    await forms.request(req);
    expect(getCommentById).toHaveBeenCalledWith('t1_xyz');
    expect(getPostById).not.toHaveBeenCalled();
    expect(normalizeComment).toHaveBeenCalledTimes(1);
    expect(normalizePost).not.toHaveBeenCalled();
  });
});
