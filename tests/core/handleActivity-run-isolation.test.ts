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

  it('Polish #42: never-resolving Promise → timeout fires, recorded as run-timeout, next run still evaluates', async () => {
    // The HIGH finding from silent-failure-hunter audit. Pre-Polish-#42 try/catch
    // only guarded throws — a Promise that never resolves would hang the for-loop
    // on that iteration. Now Promise.race w/ PER_RUN_TIMEOUT_MS catches the hang
    // + records as run-timeout (distinct from run-error) + continues to next run.
    vi.useFakeTimers();
    try {
      runRun
        .mockReturnValueOnce(new Promise(() => {})) // never resolves
        .mockResolvedValueOnce({ triggered: false, checkName: '', actions: [] });

      const promise = handleActivity(item, author, 'r_test');
      // Advance past PER_RUN_TIMEOUT_MS (10s)
      await vi.advanceTimersByTimeAsync(10_001);
      await promise;

      // Both runs evaluated — the timeout let us continue past run 1.
      expect(runRun).toHaveBeenCalledTimes(2);

      // Timeout recorded distinctly as `(run-timeout)`.
      const timeoutEvent = recordEvent.mock.calls.find(
        (c) => (c[0] as { checkName: string }).checkName === '(run-timeout)'
      );
      expect(timeoutEvent).toBeDefined();
      const payload = timeoutEvent![0] as {
        actions: { kind: string; status: string; wouldHaveCalled?: string }[];
      };
      expect(payload.actions[0]?.kind).toBe('run-timeout');
      expect(payload.actions[0]?.status).toBe('error');
      expect(payload.actions[0]?.wouldHaveCalled).toMatch(/10000ms/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('Polish #47: action that NEVER resolves → action timeout fires, recorded as error, next action still runs', async () => {
    // Pass-2 reviewer (pr-review-toolkit:code-reviewer) found this: Polish
    // #42 wrapped runRun but the action-dispatch loop (for action in
    // result.actions { await runAction(...) }) was UNGUARDED. Each runAction
    // makes Reddit API calls — same hang vector, one level deeper.
    // Polish #47 wraps each runAction in a Promise.race against 8s.
    vi.useFakeTimers();
    try {
      // TWO_RUN_CONFIG has 2 runs. Mock runRun for BOTH so the for-loop
      // doesn't get an undefined `result` on iteration 2.
      runRun
        .mockResolvedValueOnce({
          triggered: true,
          checkName: 'c1',
          actions: [
            { kind: 'remove', isSpam: true },
            { kind: 'comment', template: 'hi' },
          ],
        })
        .mockResolvedValueOnce({ triggered: false, checkName: '', actions: [] });
      // First action of run-1 hangs, second resolves normally
      runAction
        .mockReturnValueOnce(new Promise(() => {})) // never resolves
        .mockResolvedValueOnce({ status: 'ok', kind: 'comment' });

      const promise = handleActivity(item, author, 'r_test');
      await vi.advanceTimersByTimeAsync(8_001);
      await promise;

      // Both actions attempted — first timed out, second normal.
      expect(runAction).toHaveBeenCalledTimes(2);

      // recordEvent fired once for the triggered run-1.
      const triggeredEvent = recordEvent.mock.calls.find(
        (c) => (c[0] as { triggered: boolean }).triggered === true
      );
      expect(triggeredEvent).toBeDefined();
      const payload = triggeredEvent![0] as {
        actions: { kind: string; status: string; wouldHaveCalled?: string }[];
      };
      // First action result: error + wouldHaveCalled has the timeout msg
      expect(payload.actions[0]?.kind).toBe('remove');
      expect(payload.actions[0]?.status).toBe('error');
      expect(payload.actions[0]?.wouldHaveCalled).toMatch(/8000ms/);
      // Second action: succeeded normally
      expect(payload.actions[1]?.kind).toBe('comment');
      expect(payload.actions[1]?.status).toBe('ok');
    } finally {
      vi.useRealTimers();
    }
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
