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
  const actual =
    await vi.importActual<typeof import('../../src/lib/idem')>(
      '../../src/lib/idem'
    );
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
import type {
  ActionContext,
  Item,
  Author,
  AppConfig,
  RemoveAction,
} from '../../src/shared/types';

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
    reserveAction
      .mockResolvedValueOnce({ token: 'tk1' })
      .mockResolvedValueOnce({ token: 'tk2' });
    redditRemove
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined);

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
  it('returns dry-run when config.dryRun=true and skips reserve + side-effect', async () => {
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
    expect(reserveAction).not.toHaveBeenCalled();
    expect(redditRemove).not.toHaveBeenCalled();
  });

  it('per-action dryRun overrides live config', async () => {
    const dryAction: RemoveAction = { kind: 'remove', dryRun: true };
    const res = await runAction(dryAction, ctx);

    expect(res.status).toBe('dry-run');
    expect(reserveAction).not.toHaveBeenCalled();
  });

  it('per-action dryRun=false does NOT override config.dryRun=true (global is authoritative — safety gate)', async () => {
    // Codex HIGH 2026-05-16: global dry-run must be authoritative.
    // A config-level dryRun: true is the SRE non-negotiable safety setting;
    // a per-action dryRun: false trying to override it would be a catastrophic
    // bypass (mod sets the whole bot to dry-run, one rule still fires live).
    // Per-action can ONLY ELEVATE to dry-run, never demote to live.
    const liveAction: RemoveAction = { kind: 'remove', dryRun: false };
    const dryCtx: ActionContext = {
      ...ctx,
      config: { runs: [], dryRun: true },
    };
    const res = await runAction(liveAction, dryCtx);
    expect(res.status).toBe('dry-run');
    expect(reserveAction).not.toHaveBeenCalled();
    expect(redditRemove).not.toHaveBeenCalled();
  });
});
