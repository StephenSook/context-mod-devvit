/**
 * Phase 2 — Step 2.1 gate: reserveAction → side-effect → commit/release order;
 * stale-lease handling; dry-run gate (Phase 2.5).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const reserveAction = vi.fn();
const commitAction = vi.fn().mockResolvedValue(undefined);
const releaseAction = vi.fn().mockResolvedValue(undefined);
const redditRemove = vi.fn();

vi.mock('../../src/lib/idem', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/idem')>('../../src/lib/idem');
  return {
    ...actual,
    reserveAction: (...a: unknown[]) => reserveAction(...a),
    commitAction: (...a: unknown[]) => commitAction(...a),
    releaseAction: (...a: unknown[]) => releaseAction(...a),
  };
});

vi.mock('@devvit/web/server', () => ({
  reddit: {
    remove: (...a: unknown[]) => redditRemove(...a),
  },
}));

import { runAction } from '../../src/core/runAction';
import type { ActionContext, Item, Author, AppConfig, RemoveAction } from '../../src/shared/types';

const item: Item = {
  id: 't3_abc',
  title: 't',
  body: 'b',
  url: 'u',
  author: 'a',
  age: 0,
  score: 0,
  isSelf: false,
  over18: false,
  removed: false,
  approved: false,
  locked: false,
  stickied: false,
  linkFlairText: null,
};
const author: Author = {
  name: 'a',
  id: 't2_a',
  age: 0,
  linkKarma: 0,
  commentKarma: 0,
  flairText: null,
  isMod: false,
  isContributor: false,
  verified: false,
  shadowBanned: false,
};
const config: AppConfig = { runs: [] };
const ctx: ActionContext = {
  item,
  author,
  subredditName: 'sub',
  rev: 0,
  config,
};

const action: RemoveAction = { kind: 'remove' };

beforeEach(() => {
  reserveAction.mockReset();
  commitAction.mockClear();
  releaseAction.mockClear();
  redditRemove.mockReset();
});

describe('runAction — happy path', () => {
  it('reserve → side-effect → commit (in that order)', async () => {
    const order: string[] = [];
    reserveAction.mockImplementation(async () => {
      order.push('reserve');
      return { token: 'tk' };
    });
    redditRemove.mockImplementation(async () => {
      order.push('side-effect');
    });
    commitAction.mockImplementation(async () => {
      order.push('commit');
    });

    const res = await runAction(action, ctx);

    expect(res).toEqual({ status: 'ok', kind: 'remove' });
    expect(order).toEqual(['reserve', 'side-effect', 'commit']);
    expect(releaseAction).not.toHaveBeenCalled();
  });
});

describe('runAction — failure path', () => {
  it('releases the reservation when the Devvit call throws + returns error', async () => {
    reserveAction.mockResolvedValueOnce({ token: 'tk' });
    redditRemove.mockRejectedValueOnce(new Error('boom'));

    const res = await runAction(action, ctx);

    expect(res).toEqual({ status: 'error', kind: 'remove' });
    expect(releaseAction).toHaveBeenCalledTimes(1);
    expect(commitAction).not.toHaveBeenCalled();
  });

  it('retry after release succeeds', async () => {
    reserveAction.mockResolvedValueOnce({ token: 'tk1' }).mockResolvedValueOnce({ token: 'tk2' });
    redditRemove.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);

    await runAction(action, ctx); // first attempt fails
    const second = await runAction(action, ctx); // retry

    expect(second).toEqual({ status: 'ok', kind: 'remove' });
    expect(commitAction).toHaveBeenCalledTimes(1);
  });
});

describe('runAction — stale-lease path', () => {
  it('returns skipped-locked when reserveAction returns false', async () => {
    reserveAction.mockResolvedValueOnce(null);

    const res = await runAction(action, ctx);

    expect(res).toEqual({ status: 'skipped-locked', kind: 'remove' });
    expect(redditRemove).not.toHaveBeenCalled();
    expect(commitAction).not.toHaveBeenCalled();
    expect(releaseAction).not.toHaveBeenCalled();
  });
});

describe('runAction — dry-run gate (Phase 2.5)', () => {
  it('AE CRITICAL #7: dry-run reserves + commits done marker but skips side-effect', async () => {
    // AE CRITICAL #7 fix — previously dry-run short-circuited BEFORE
    // reserveAction so the done marker was never written. A retry after
    // dryRun→false toggle would re-fire the action. Now we reserve +
    // commit just like live mode but skip the Reddit call.
    reserveAction.mockResolvedValueOnce({ token: 'tk-dry' });
    const dryCtx: ActionContext = {
      ...ctx,
      config: { runs: [], dryRun: true },
    };
    const res = await runAction(action, dryCtx);

    expect(res).toEqual({
      status: 'dry-run',
      kind: 'remove',
      wouldHaveCalled: 'remove',
    });
    expect(reserveAction).toHaveBeenCalledTimes(1);
    expect(commitAction).toHaveBeenCalledWith(expect.any(String), 'tk-dry', ctx.subredditName);
    // Side-effect NEVER fires — the whole point of dry-run.
    expect(redditRemove).not.toHaveBeenCalled();
  });

  it('AE CRITICAL #7: per-action dryRun=true also reserves + commits but skips side-effect', async () => {
    reserveAction.mockResolvedValueOnce({ token: 'tk-dry2' });
    const dryAction: RemoveAction = { kind: 'remove', dryRun: true };
    const res = await runAction(dryAction, ctx);

    expect(res.status).toBe('dry-run');
    expect(reserveAction).toHaveBeenCalledTimes(1);
    expect(commitAction).toHaveBeenCalled();
    expect(redditRemove).not.toHaveBeenCalled();
  });

  it('per-action dryRun=false does NOT override config.dryRun=true (global is authoritative — safety gate)', async () => {
    // Codex HIGH 2026-05-16: global dry-run must be authoritative.
    // A config-level dryRun: true is the SRE non-negotiable safety setting;
    // a per-action dryRun: false trying to override it would be a catastrophic
    // bypass (mod sets the whole bot to dry-run, one rule still fires live).
    // Per-action can ONLY ELEVATE to dry-run, never demote to live.
    reserveAction.mockResolvedValueOnce({ token: 'tk-dry3' });
    const liveAction: RemoveAction = { kind: 'remove', dryRun: false };
    const dryCtx: ActionContext = {
      ...ctx,
      config: { runs: [], dryRun: true },
    };
    const res = await runAction(liveAction, dryCtx);
    expect(res.status).toBe('dry-run');
    // Reserve still happens (AE #7) but side-effect MUST NOT fire (safety gate).
    expect(redditRemove).not.toHaveBeenCalled();
  });

  it('AE CRITICAL #7: dry-run respects skipped-locked when prior attempt already reserved', async () => {
    // If a live attempt already reserved this actionId (e.g., a prior
    // crash left a 5-min lease), a subsequent dry-run should NOT fight
    // for the lease — it surfaces skipped-locked just like a live retry.
    reserveAction.mockResolvedValueOnce(null);
    const dryCtx: ActionContext = {
      ...ctx,
      config: { runs: [], dryRun: true },
    };
    const res = await runAction(action, dryCtx);
    expect(res).toEqual({ status: 'skipped-locked', kind: 'remove' });
    expect(commitAction).not.toHaveBeenCalled();
    expect(redditRemove).not.toHaveBeenCalled();
  });

  it('AE CRITICAL #7: dry-run commitAction failure is harmless (does NOT throw)', async () => {
    // Since the Reddit side-effect didn't fire, a failed done-marker
    // write just means a retry will re-dry-run — idempotent in observable
    // Reddit state. Should log warn + return dry-run, not propagate.
    reserveAction.mockResolvedValueOnce({ token: 'tk-dry-fail' });
    commitAction.mockRejectedValueOnce(new Error('redis down'));
    const dryCtx: ActionContext = {
      ...ctx,
      config: { runs: [], dryRun: true },
    };
    const res = await runAction(action, dryCtx);
    expect(res.status).toBe('dry-run');
    expect(redditRemove).not.toHaveBeenCalled();
  });

  it('AE CRITICAL #7: bypassIdempotency=true → skips reserve+commit (mod-menu repeatability)', async () => {
    // Mod-menu dryRunActivity sets this so multiple "Test rules" invocations
    // on the same post don't trip skipped-locked from the first run's marker.
    const dryCtx: ActionContext = {
      ...ctx,
      config: { runs: [], dryRun: true },
      bypassIdempotency: true,
    };
    const res = await runAction(action, dryCtx);
    expect(res.status).toBe('dry-run');
    expect(reserveAction).not.toHaveBeenCalled();
    expect(commitAction).not.toHaveBeenCalled();
    expect(redditRemove).not.toHaveBeenCalled();
  });

  it('AE CRITICAL #7: bypassIdempotency=true + live action → forced dry-run (safety violation refused)', async () => {
    // Defense-in-depth — bypassIdempotency must ONLY be used with dry-run.
    // A live action with this flag would have NO double-action protection.
    // runAction refuses the side-effect + returns dry-run regardless.
    const liveCtx: ActionContext = {
      ...ctx,
      config: { runs: [] }, // no dryRun
      bypassIdempotency: true,
    };
    const liveAction: RemoveAction = { kind: 'remove' };
    const res = await runAction(liveAction, liveCtx);
    expect(res.status).toBe('dry-run');
    expect(redditRemove).not.toHaveBeenCalled();
  });

  // AE Polish #82: gemini brutal-audit P2-1. Non-retryable errors now
  // commitAction (seal the slot) instead of releaseAction (retry). Avoids
  // wasting the 5-min pending TTL on deterministic 4xx failures.
  describe('Polish #82: non-retryable error path', () => {
    it('seals slot via commitAction on "already removed" error', async () => {
      reserveAction.mockResolvedValueOnce({ token: 'tk-xyz' });
      redditRemove.mockRejectedValueOnce(new Error('HTTP 400: post already removed'));
      const res = await runAction({ kind: 'remove' }, ctx);
      expect(res.status).toBe('error');
      // AE Polish #92: assert commitAction received the correct token
      // (pre-fix the test stubbed reserveAction with a bare string;
      // destructuring yielded token: undefined; a regression that
      // dropped the token from the call would have passed the prior
      // `toHaveBeenCalled()` assertion).
      expect(commitAction).toHaveBeenCalledWith(expect.any(String), 'tk-xyz', ctx.subredditName);
      expect(releaseAction).not.toHaveBeenCalled();
    });

    it('seals slot on HTTP 404 not-found error', async () => {
      reserveAction.mockResolvedValueOnce({ token: 'tk-xyz' });
      redditRemove.mockRejectedValueOnce(new Error('HTTP 404: comment not found'));
      const res = await runAction({ kind: 'remove' }, ctx);
      expect(res.status).toBe('error');
      expect(commitAction).toHaveBeenCalled();
      expect(releaseAction).not.toHaveBeenCalled();
    });

    it('seals slot on forbidden / unauthorized error', async () => {
      reserveAction.mockResolvedValueOnce({ token: 'tk-xyz' });
      redditRemove.mockRejectedValueOnce(new Error('403 Forbidden: action not permitted'));
      const res = await runAction({ kind: 'remove' }, ctx);
      expect(res.status).toBe('error');
      expect(commitAction).toHaveBeenCalled();
      expect(releaseAction).not.toHaveBeenCalled();
    });

    it('STILL releases for retry on transient network error (retryable)', async () => {
      reserveAction.mockResolvedValueOnce({ token: 'tk-xyz' });
      redditRemove.mockRejectedValueOnce(new Error('ECONNRESET'));
      const res = await runAction({ kind: 'remove' }, ctx);
      expect(res.status).toBe('error');
      expect(releaseAction).toHaveBeenCalled();
      // commitAction may have been called by the dry-run gate; what we
      // care about is that releaseAction was the catch-side action.
    });

    it('STILL releases for retry on HTTP 5xx error (retryable)', async () => {
      reserveAction.mockResolvedValueOnce({ token: 'tk-xyz' });
      redditRemove.mockRejectedValueOnce(new Error('HTTP 503: service unavailable'));
      const res = await runAction({ kind: 'remove' }, ctx);
      expect(res.status).toBe('error');
      expect(releaseAction).toHaveBeenCalled();
    });

    it('non-retryable commitAction failure → harmless (logged, returns error anyway)', async () => {
      reserveAction.mockResolvedValueOnce({ token: 'tk-xyz' });
      redditRemove.mockRejectedValueOnce(new Error('HTTP 404: not found'));
      commitAction.mockRejectedValueOnce(new Error('redis blip during seal'));
      const res = await runAction({ kind: 'remove' }, ctx);
      // Falls through to log warn, still returns error — pending TTL reaps.
      expect(res.status).toBe('error');
    });
  });
});
