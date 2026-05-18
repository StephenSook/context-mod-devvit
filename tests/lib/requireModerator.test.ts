/**
 * W6 regression — requireModerator gate. Auth-fail paths must not return
 * ok:true. This helper is the only thing standing between non-mods and
 * mutation/cost-bearing endpoints (forms.ts + api.ts) so the contract
 * needs explicit pinning.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const getCurrentSubreddit = vi.fn();
const getCurrentUser = vi.fn();
const getModerators = vi.fn();

vi.mock('@devvit/web/server', () => ({
  reddit: {
    getCurrentSubreddit: () => getCurrentSubreddit(),
    getCurrentUser: () => getCurrentUser(),
    getModerators: (opts: unknown) => ({ all: () => getModerators(opts) }),
  },
}));

import { requireModerator } from '../../src/lib/requireModerator';

beforeEach(() => {
  getCurrentSubreddit.mockReset();
  getCurrentUser.mockReset();
  getModerators.mockReset();
  getCurrentSubreddit.mockResolvedValue({ name: 'r_test' });
});

describe('requireModerator', () => {
  it('returns ok:true with sub + username when caller is a mod', async () => {
    getCurrentUser.mockResolvedValue({ username: 'mod_alice' });
    getModerators.mockResolvedValue([
      { username: 'mod_alice' },
      { username: 'mod_bob' },
    ]);
    const r = await requireModerator();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.sub).toBe('r_test');
      expect(r.username).toBe('mod_alice');
    }
  });

  it('returns 403 when getModerators excludes the caller', async () => {
    getCurrentUser.mockResolvedValue({ username: 'random_user' });
    getModerators.mockResolvedValue([
      { username: 'mod_alice' },
      { username: 'mod_bob' },
    ]);
    const r = await requireModerator();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(403);
      expect(r.error).toMatch(/not a moderator/i);
    }
  });

  it('returns 401 when getCurrentUser returns null username', async () => {
    getCurrentUser.mockResolvedValue(null);
    const r = await requireModerator();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(401);
      expect(r.error).toMatch(/not authenticated/i);
    }
    expect(getModerators).not.toHaveBeenCalled();
  });

  it('returns 401 when getCurrentUser returns object without username', async () => {
    getCurrentUser.mockResolvedValue({});
    const r = await requireModerator();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });

  it('returns 500 fail-CLOSED when getModerators throws', async () => {
    getCurrentUser.mockResolvedValue({ username: 'mod_alice' });
    getModerators.mockRejectedValue(new Error('reddit api 503'));
    const r = await requireModerator();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(500);
      expect(r.error).toMatch(/mod check failed/i);
    }
  });

  it('returns 500 when getCurrentSubreddit throws (context lost)', async () => {
    getCurrentSubreddit.mockRejectedValue(new Error('context'));
    const r = await requireModerator();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(500);
  });
});
