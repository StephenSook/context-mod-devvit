/**
 * Polish #41 — per-run try/catch in handleActivity for-loop.
 *
 * If a rule throws (which it shouldn't, but transient external API errors
 * inside rules.history/attribution/recentActivity/imageRepost CAN bubble
 * up), the throw passes through runRule → runCheck → runRun (none have
 * catches) and would hit handleActivity's for-loop. Pre-Polish-#41 this
 * aborted the loop → subsequent runs for the SAME event never evaluated.
 * Now each runRun call is wrapped in try/catch → log + recordEvent the
 * run-error + continue.
 *
 * Tested independently of the real runRun pipeline by mocking runRun
 * directly. Separate file from handleActivity.test.ts so we don't
 * accidentally short-circuit the real-pipeline tests with a module mock.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const getCurrentRev = vi.fn();
const recordEvent = vi.fn().mockResolvedValue(undefined);
const runRun = vi.fn();
const runAction = vi.fn();

vi.mock('../../src/state/configStore', () => ({
  getCurrentRev: (...a: unknown[]) => getCurrentRev(...a),
}));
vi.mock('../../src/state/recentEvents', () => ({
  recordEvent: (...a: unknown[]) => recordEvent(...a),
}));
vi.mock('../../src/core/runRun', () => ({
  runRun: (...a: unknown[]) => runRun(...a),
}));
vi.mock('../../src/core/runAction', () => ({
  runAction: (...a: unknown[]) => runAction(...a),
}));
// idem.ts is imported transitively by runAction (which we mock) — stub it.
vi.mock('../../src/lib/idem', () => ({
  firstSeen: vi.fn().mockResolvedValue(true),
  reserveAction: vi.fn(),
  commitAction: vi.fn(),
  releaseAction: vi.fn(),
  actionId: vi.fn(() => 'aid'),
  fnv1a64: vi.fn(() => 'fnv'),
  acquireLock: vi.fn(),
}));

import { handleActivity } from '../../src/core/handleActivity';
import type { Item, Author, AppConfig } from '../../src/shared/types';

const item: Item = {
  id: 't3_abc',
  title: 'whatever',
  body: '',
  url: '',
  author: 'u',
  age: 100,
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
  name: 'u',
  id: 't2_u',
  age: 0,
  linkKarma: 0,
  commentKarma: 0,
  flairText: null,
  isMod: false,
  isContributor: false,
  verified: false,
  shadowBanned: false,
};

const TWO_RUN_CONFIG: AppConfig = {
  runs: [
    { name: 'first-run', checks: [] },
    { name: 'second-run', checks: [] },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentRev.mockResolvedValue({ rev: 1, config: TWO_RUN_CONFIG });
});

describe('handleActivity per-run try/catch (Polish #41)', () => {
  it('throw in run 1 → logs + recordEvent w/ run-error + run 2 STILL evaluates', async () => {
    runRun
      .mockRejectedValueOnce(new Error('rule path threw — Redis ECONNRESET'))
      .mockResolvedValueOnce({ triggered: false, checkName: '', actions: [] });

    await handleActivity(item, author, 'r_test');

    // Both runs got called — the catch let us continue past run 1.
    expect(runRun).toHaveBeenCalledTimes(2);
    expect(runRun.mock.calls[0]![0]).toMatchObject({ name: 'first-run' });
    expect(runRun.mock.calls[1]![0]).toMatchObject({ name: 'second-run' });

    // The throw got recorded as a run-error event.
    const runErrorEvent = recordEvent.mock.calls.find(
      (c) => (c[0] as { checkName: string }).checkName === '(run-error)'
    );
    expect(runErrorEvent).toBeDefined();
    const payload = runErrorEvent![0] as {
      runName: string;
      triggered: boolean;
      actions: { kind: string; status: string }[];
    };
    expect(payload.runName).toBe('first-run');
    expect(payload.triggered).toBe(false);
    expect(payload.actions[0]?.kind).toBe('run-error');
    expect(payload.actions[0]?.status).toBe('error');
  });

  it('Polish #41: both runs throw → both recorded as run-error, no propagation', async () => {
    runRun
      .mockRejectedValueOnce(new Error('first run threw'))
      .mockRejectedValueOnce(new Error('second run threw'));

    // Critical guarantee: handleActivity does NOT propagate either throw.
    await expect(handleActivity(item, author, 'r_test')).resolves.toBeUndefined();

    expect(runRun).toHaveBeenCalledTimes(2);
    // Both run errors recorded.
    const runErrorEvents = recordEvent.mock.calls.filter(
      (c) => (c[0] as { checkName: string }).checkName === '(run-error)'
    );
    expect(runErrorEvents).toHaveLength(2);
  });

  it('Polish #41: throw in run 1, normal trigger in run 2 → run 2 actions still execute', async () => {
    runRun
      .mockRejectedValueOnce(new Error('first run threw'))
      .mockResolvedValueOnce({
        triggered: true,
        checkName: 'c2',
        actions: [{ kind: 'remove', isSpam: true }],
      });
    runAction.mockResolvedValueOnce({ status: 'ok', kind: 'remove' });

    await handleActivity(item, author, 'r_test');

    // run 2's remove action ran despite run 1 throwing.
    expect(runAction).toHaveBeenCalledTimes(1);
    // run-error AND triggered event both recorded.
    expect(recordEvent.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('Polish #41: error message truncated to 200 chars in event payload', async () => {
    const longMsg = 'x'.repeat(500);
    runRun.mockRejectedValueOnce(new Error(longMsg));
    runRun.mockResolvedValueOnce({ triggered: false, checkName: '', actions: [] });
    await handleActivity(item, author, 'r_test');
    const runErrorEvent = recordEvent.mock.calls.find(
      (c) => (c[0] as { checkName: string }).checkName === '(run-error)'
    );
    const payload = runErrorEvent![0] as {
      actions: { wouldHaveCalled?: string }[];
    };
    expect(payload.actions[0]?.wouldHaveCalled?.length).toBeLessThanOrEqual(200);
  });
});
