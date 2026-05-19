/**
 * Polish #48 — dryRunActivity per-run isolation + timeout parity w/ handleActivity.
 *
 * Same hang vector as pre-Polish-#42 handleActivity: a hung runRun (e.g.
 * imageRepost rule fetch that never resolves) would stall the mod's
 * "Test rules on this item" form submit until Devvit's request timeout
 * fired silently. Same `runWithTimeout` primitive (extracted to
 * src/lib/timeout.ts as part of Polish #48) used in both files for
 * parity.
 *
 * Separate file from dryRunActivity.test.ts so the runRun module mock
 * doesn't short-circuit the existing real-pipeline tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const getCurrentRev = vi.fn();
const runRun = vi.fn();
const runAction = vi.fn();

vi.mock('../../src/state/configStore', () => ({
  getCurrentRev: (...a: unknown[]) => getCurrentRev(...a),
}));
vi.mock('../../src/core/runRun', () => ({
  runRun: (...a: unknown[]) => runRun(...a),
}));
vi.mock('../../src/core/runAction', () => ({
  runAction: (...a: unknown[]) => runAction(...a),
}));
// idem.ts is imported transitively by runAction (mocked) — stub.
vi.mock('../../src/lib/idem', () => ({
  firstSeen: vi.fn().mockResolvedValue(true),
  reserveAction: vi.fn(),
  commitAction: vi.fn(),
  releaseAction: vi.fn(),
  actionId: vi.fn(() => 'aid'),
  fnv1a64: vi.fn(() => 'fnv'),
  acquireLock: vi.fn(),
}));

import { dryRunActivity } from '../../src/core/dryRunActivity';
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

describe('dryRunActivity per-run isolation + timeout (Polish #48)', () => {
  it('Polish #48: throw in run 1 → recorded as run-error + run 2 still evaluates', async () => {
    runRun
      .mockRejectedValueOnce(new Error('rule path threw — Redis ECONNRESET'))
      .mockResolvedValueOnce({ triggered: false, checkName: '', actions: [] });

    const result = await dryRunActivity(item, author, 'r_test');

    expect(runRun).toHaveBeenCalledTimes(2);
    // Run 1 recorded as run-error
    expect(result.runs).toHaveLength(2);
    expect(result.runs[0]?.runName).toBe('first-run');
    expect(result.runs[0]?.triggered).toBe(false);
    expect(result.runs[0]?.checkName).toBe('(run-error)');
    // Run 2 evaluated normally
    expect(result.runs[1]?.runName).toBe('second-run');
  });

  it('Polish #48: never-resolving Promise in run 1 → timeout fires + run 2 still evaluates', async () => {
    vi.useFakeTimers();
    try {
      runRun
        .mockReturnValueOnce(new Promise(() => {})) // never resolves
        .mockResolvedValueOnce({ triggered: false, checkName: '', actions: [] });

      const promise = dryRunActivity(item, author, 'r_test');
      await vi.advanceTimersByTimeAsync(10_001);
      const result = await promise;

      expect(runRun).toHaveBeenCalledTimes(2);
      expect(result.runs[0]?.checkName).toBe('(run-timeout)');
      expect(result.runs[0]?.actions[0]?.wouldHaveCalled).toMatch(/10000ms/);
      expect(result.runs[1]?.runName).toBe('second-run');
    } finally {
      vi.useRealTimers();
    }
  });

  it('Polish #48: configPresent:false short-circuits before runRun ever called', async () => {
    getCurrentRev.mockResolvedValueOnce(null);
    const result = await dryRunActivity(item, author, 'r_test');
    expect(result.configPresent).toBe(false);
    expect(result.runs).toEqual([]);
    expect(runRun).not.toHaveBeenCalled();
  });
});
