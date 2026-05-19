/**
 * Polish #30 — modActivity.ts contract tests.
 *
 * Previously uncovered: relied on indirect API-route tests for the happy
 * path but no direct unit tests on the storage layer's Redis-error
 * fail-OPEN behavior, ring-buffer trim, or corrupt-member tolerance.
 *
 * Pins:
 *   - logModActivity returns void on success
 *   - logModActivity swallows Redis errors (fail-OPEN — audit log is
 *     non-critical telemetry, mod action already happened)
 *   - logModActivity is a no-op when sub is undefined (defensive)
 *   - readModActivity returns [] when sub is undefined
 *   - readModActivity returns [] on Redis error
 *   - readModActivity parses + filters corrupt JSON members
 *   - RING_SIZE trim invariant — zRemRangeByRank called w/ correct range
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const redisZAdd = vi.fn();
const redisZRange = vi.fn();
const redisZRemRangeByRank = vi.fn();

vi.mock('@devvit/web/server', () => ({
  redis: {
    zAdd: (...a: unknown[]) => redisZAdd(...a),
    zRange: (...a: unknown[]) => redisZRange(...a),
    zRemRangeByRank: (...a: unknown[]) => redisZRemRangeByRank(...a),
  },
}));

import { logModActivity, readModActivity, type ModActivity } from '../../src/state/modActivity';

beforeEach(() => {
  vi.clearAllMocks();
  redisZAdd.mockResolvedValue(1);
  redisZRemRangeByRank.mockResolvedValue(0);
  redisZRange.mockResolvedValue([]);
});

describe('logModActivity (Polish #30)', () => {
  it('happy path: zAdd entry + zRemRangeByRank to enforce 50-deep ring', async () => {
    const entry: ModActivity = {
      ts: 1700000000000,
      actor: 'mod_alice',
      kind: 'reload-config',
    };
    await logModActivity('r_test', entry);
    expect(redisZAdd).toHaveBeenCalledTimes(1);
    expect(redisZAdd).toHaveBeenCalledWith('cm:mod-activity:r_test', {
      score: 1700000000000,
      member: JSON.stringify(entry),
    });
    // Ring trim: keeps the most-recent 50 (drop indexes 0..-(50+1) = 0..-51).
    expect(redisZRemRangeByRank).toHaveBeenCalledWith('cm:mod-activity:r_test', 0, -51);
  });

  it('no-op when sub is undefined (defensive — caller forgot to thread sub)', async () => {
    await logModActivity(undefined, {
      ts: 1,
      actor: 'a',
      kind: 'reload-config',
    });
    expect(redisZAdd).not.toHaveBeenCalled();
    expect(redisZRemRangeByRank).not.toHaveBeenCalled();
  });

  it('fail-OPEN: swallows Redis throw (audit log is non-critical telemetry)', async () => {
    redisZAdd.mockRejectedValueOnce(new Error('Redis ECONNRESET'));
    // Should NOT throw — caller already performed the mod action; failing
    // here would bubble up + risk double-applying the action on retry.
    await expect(
      logModActivity('r_test', { ts: 1, actor: 'a', kind: 'mute-rule' })
    ).resolves.toBeUndefined();
  });

  it('fail-OPEN: swallows zRemRangeByRank throw too (partial-success)', async () => {
    redisZRemRangeByRank.mockRejectedValueOnce(new Error('Redis hang'));
    await expect(
      logModActivity('r_test', { ts: 1, actor: 'a', kind: 'explain-rule' })
    ).resolves.toBeUndefined();
  });

  it('preserves optional detail field through JSON round-trip', async () => {
    const entry: ModActivity = {
      ts: 1,
      actor: 'a',
      kind: 'mute-rule',
      detail: 'spam-removal/crypto-giveaway',
    };
    await logModActivity('r_test', entry);
    const [, payload] = redisZAdd.mock.calls[0] as [string, { member: string }];
    const round = JSON.parse(payload.member);
    expect(round.detail).toBe('spam-removal/crypto-giveaway');
  });
});

describe('readModActivity (Polish #30)', () => {
  it('returns [] when sub is undefined', async () => {
    const result = await readModActivity(undefined);
    expect(result).toEqual([]);
    expect(redisZRange).not.toHaveBeenCalled();
  });

  it('returns [] on Redis throw (fail-OPEN)', async () => {
    redisZRange.mockRejectedValueOnce(new Error('Redis down'));
    const result = await readModActivity('r_test');
    expect(result).toEqual([]);
  });

  it('parses ZSET members + returns reverse-chrono', async () => {
    const e1 = { ts: 2, actor: 'b', kind: 'mute-rule' };
    const e2 = { ts: 1, actor: 'a', kind: 'reload-config' };
    redisZRange.mockResolvedValueOnce([
      { score: 2, member: JSON.stringify(e1) },
      { score: 1, member: JSON.stringify(e2) },
    ]);
    const result = await readModActivity('r_test');
    expect(result).toHaveLength(2);
    expect(result[0]?.actor).toBe('b');
    expect(result[1]?.actor).toBe('a');
    expect(redisZRange).toHaveBeenCalledWith('cm:mod-activity:r_test', 0, -1, {
      by: 'score',
      reverse: true,
    });
  });

  it('Polish #30: drops corrupt JSON members + logs count (no throw)', async () => {
    // Mix of valid + corrupt — corrupt one shouldn't take out the read.
    const valid = { ts: 1, actor: 'a', kind: 'reload-config' };
    redisZRange.mockResolvedValueOnce([
      { score: 2, member: '{this is not valid json' },
      { score: 1, member: JSON.stringify(valid) },
      { score: 0, member: 'totally broken' },
    ]);
    const result = await readModActivity('r_test');
    // 1 valid out of 3, 2 corrupt members dropped.
    expect(result).toHaveLength(1);
    expect(result[0]?.actor).toBe('a');
  });

  it('returns empty array on empty ZSET (not undefined)', async () => {
    redisZRange.mockResolvedValueOnce([]);
    const result = await readModActivity('r_test');
    expect(result).toEqual([]);
  });

  // AE Polish #78: gemini brutal-audit P1-8. Cast-without-validation was
  // letting poisoned blobs through to dashboard rendering. New
  // isValidModActivity validator filters bad shapes on read.
  it('Polish #78: shape-mismatch member (missing actor) dropped + counted', async () => {
    const valid = { ts: 10, actor: 'good_mod', kind: 'reload-config' };
    const missingActor = { ts: 5, kind: 'reload-config' }; // poisoned: no actor
    redisZRange.mockResolvedValueOnce([
      { score: 10, member: JSON.stringify(valid) },
      { score: 5, member: JSON.stringify(missingActor) },
    ]);
    const result = await readModActivity('r_test');
    expect(result).toHaveLength(1);
    expect(result[0]?.actor).toBe('good_mod');
  });

  it('Polish #78: unknown kind (schema drift) dropped — does not propagate to render', async () => {
    const ancient = { ts: 1, actor: 'a', kind: 'remove-old-action' }; // pre-Wave-S kind
    redisZRange.mockResolvedValueOnce([{ score: 1, member: JSON.stringify(ancient) }]);
    const result = await readModActivity('r_test');
    expect(result).toEqual([]);
  });

  it('Polish #78: non-string detail field dropped', async () => {
    const poisoned = {
      ts: 1,
      actor: 'a',
      kind: 'reload-config',
      detail: { not: 'a string' }, // poisoned: detail must be string | undefined
    };
    redisZRange.mockResolvedValueOnce([{ score: 1, member: JSON.stringify(poisoned) }]);
    const result = await readModActivity('r_test');
    expect(result).toEqual([]);
  });
});
