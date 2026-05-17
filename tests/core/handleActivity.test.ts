/**
 * Phase 2 — Step 2.3 gate: end-to-end orchestrator wiring.
 * Loads a fixture config, feeds a fixture Item/Author, mocks the Devvit client,
 * asserts the right actions fire in the right order AND the recordEvent payload
 * carries populated `actions: { kind, ok }[]` (Council fix — Software Lead).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const getCurrentRev = vi.fn();
const recordEvent = vi.fn().mockResolvedValue(undefined);
const reserveAction = vi.fn().mockResolvedValue(true);
const commitAction = vi.fn().mockResolvedValue(undefined);
const releaseAction = vi.fn().mockResolvedValue(undefined);
const redditRemove = vi.fn().mockResolvedValue(undefined);
const redditApprove = vi.fn().mockResolvedValue(undefined);

vi.mock('../../src/state/configStore', () => ({
  getCurrentRev: (...a: unknown[]) => getCurrentRev(...a),
}));

vi.mock('../../src/state/recentEvents', () => ({
  recordEvent: (...a: unknown[]) => recordEvent(...a),
}));

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
    approve: (...a: unknown[]) => redditApprove(...a),
  },
}));

import { handleActivity } from '../../src/core/handleActivity';
import type { Item, Author, AppConfig } from '../../src/shared/types';

const item: Item = {
  id: 't3_abc', title: 'free crypto giveaway', body: '', url: 'https://x.example',
  author: 'spammer', age: 100, score: 0, isSelf: false, over18: false,
  removed: false, approved: false, locked: false, stickied: false, linkFlairText: null,
};
const author: Author = {
  name: 'spammer', id: 't2_s', age: 0, linkKarma: 0, commentKarma: 0,
  flairText: null, isMod: false, isContributor: false, verified: false, shadowBanned: false,
};

const config: AppConfig = {
  runs: [{
    name: 'main',
    checks: [{
      name: 'spam-title',
      combinator: 'OR',
      rules: [{ kind: 'regex', pattern: 'crypto|giveaway', flags: 'i' }],
      actions: [{ kind: 'remove', isSpam: true }],
    }],
  }],
};

beforeEach(() => {
  getCurrentRev.mockReset();
  recordEvent.mockClear();
  reserveAction.mockClear(); reserveAction.mockResolvedValue(true);
  commitAction.mockClear();
  releaseAction.mockClear();
  redditRemove.mockClear(); redditRemove.mockResolvedValue(undefined);
  redditApprove.mockClear(); redditApprove.mockResolvedValue(undefined);
});

describe('handleActivity', () => {
  it('no-ops when no config has been published', async () => {
    getCurrentRev.mockResolvedValueOnce(null);
    await handleActivity(item, author, 'sub');
    expect(redditRemove).not.toHaveBeenCalled();
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it('triggers a matching rule → fires action → records event with kind+ok', async () => {
    getCurrentRev.mockResolvedValueOnce({ rev: 3, config });

    await handleActivity(item, author, 'cm_devvit_test');

    expect(redditRemove).toHaveBeenCalledWith('t3_abc', true);
    expect(recordEvent).toHaveBeenCalledTimes(1);
    const [event, subPassed] = recordEvent.mock.calls[0] as [Record<string, unknown>, string];
    expect(subPassed).toBe('cm_devvit_test');
    expect(event.activityId).toBe('t3_abc');
    expect(event.runName).toBe('main');
    expect(event.checkName).toBe('spam-title');
    expect(event.triggered).toBe(true);
    expect(event.actions).toEqual([{ kind: 'remove', ok: true, status: 'ok' }]);
  });

  it('records ok:false + status:error when the action errors', async () => {
    getCurrentRev.mockResolvedValueOnce({ rev: 0, config });
    redditRemove.mockRejectedValueOnce(new Error('reddit down'));

    await handleActivity(item, author, 'sub');

    const event = recordEvent.mock.calls[0]![0] as Record<string, unknown>;
    expect(event.actions).toEqual([{ kind: 'remove', ok: false, status: 'error' }]);
  });

  it('does not record an event when no run triggered', async () => {
    getCurrentRev.mockResolvedValueOnce({
      rev: 0,
      config: {
        runs: [{
          name: 'main',
          checks: [{
            name: 'never',
            combinator: 'OR',
            rules: [{ kind: 'regex', pattern: '^never-matches$' }],
            actions: [{ kind: 'remove' }],
          }],
        }],
      } as AppConfig,
    });

    await handleActivity(item, author, 'sub');

    expect(redditRemove).not.toHaveBeenCalled();
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it('dispatches actions in declared order across multiple runs', async () => {
    const order: string[] = [];
    redditRemove.mockImplementationOnce(async () => { order.push('remove'); });
    redditApprove.mockImplementationOnce(async () => { order.push('approve'); });

    getCurrentRev.mockResolvedValueOnce({
      rev: 0,
      config: {
        runs: [
          {
            name: 'r1',
            checks: [{
              name: 'c1', combinator: 'OR',
              rules: [{ kind: 'regex', pattern: 'crypto', flags: 'i' }],
              actions: [{ kind: 'remove' }],
            }],
          },
          {
            name: 'r2',
            checks: [{
              name: 'c2', combinator: 'OR',
              rules: [{ kind: 'regex', pattern: 'crypto', flags: 'i' }],
              actions: [{ kind: 'approve' }],
            }],
          },
        ],
      } as AppConfig,
    });

    await handleActivity(item, author, 'sub');

    expect(order).toEqual(['remove', 'approve']);
    expect(recordEvent).toHaveBeenCalledTimes(2);
  });

  it('respects config.dryRun globally — no Reddit calls, but event recorded', async () => {
    getCurrentRev.mockResolvedValueOnce({ rev: 0, config: { ...config, dryRun: true } });

    await handleActivity(item, author, 'sub');

    expect(redditRemove).not.toHaveBeenCalled();
    expect(recordEvent).toHaveBeenCalledTimes(1);
    const event = recordEvent.mock.calls[0]![0] as Record<string, unknown>;
    // dry-run is not "ok" (we didn't actually do the thing). Codex session-HIGH
    // 2026-05-16: now carries status:'dry-run' + wouldHaveCalled so dashboard
    // can render distinct chip.
    expect(event.actions).toEqual([
      { kind: 'remove', ok: false, status: 'dry-run', wouldHaveCalled: 'remove' },
    ]);
  });

  it('Codex H3 — uses provided snapshot, skips internal getCurrentRev call (read-once invariant)', async () => {
    // Previous bug: trigger reads config for normalize → handleActivity reads
    // config AGAIN for rule eval. A publish between the two reads splits the
    // event across two revs. Fix: pass snapshot in, handleActivity uses it.
    await handleActivity(item, author, 'cm_devvit_test', { rev: 7, config });

    expect(getCurrentRev).not.toHaveBeenCalled();
    expect(redditRemove).toHaveBeenCalledWith('t3_abc', true);
    const event = recordEvent.mock.calls[0]![0] as Record<string, unknown>;
    expect(event.activityId).toBe('t3_abc');
    expect(event.triggered).toBe(true);
  });

  it('Codex H3 — back-compat: snapshot-less call still reads via getCurrentRev', async () => {
    getCurrentRev.mockResolvedValueOnce({ rev: 9, config });
    await handleActivity(item, author, 'sub');
    expect(getCurrentRev).toHaveBeenCalledTimes(1);
  });
});
