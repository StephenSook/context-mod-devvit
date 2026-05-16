/**
 * Phase 2 supporting gate: recordEvent writes a v1-stamped JSON member to the
 * events:recent50 ZSET, scored by ts, and trims to the most-recent 50.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const zAdd = vi.fn().mockResolvedValue(1);
const zRemRangeByRank = vi.fn().mockResolvedValue(0);

vi.mock('@devvit/web/server', () => ({
  redis: {
    zAdd: (...a: unknown[]) => zAdd(...a),
    zRemRangeByRank: (...a: unknown[]) => zRemRangeByRank(...a),
  },
}));

import { recordEvent } from '../../src/state/recentEvents';

beforeEach(() => {
  zAdd.mockClear();
  zRemRangeByRank.mockClear();
});

describe('recordEvent', () => {
  it('writes a v1 + nonce-stamped JSON member, scored by ts, to the sub-scoped key', async () => {
    await recordEvent({
      ts: 1_000_000,
      activityId: 't3_abc',
      runName: 'main',
      checkName: 'spam',
      triggered: true,
      actions: [{ kind: 'remove', ok: true }],
    }, 'cm_devvit_test');

    expect(zAdd).toHaveBeenCalledTimes(1);
    const [key, entry] = zAdd.mock.calls[0] as [string, { score: number; member: string }];
    expect(key).toBe('cm:cm_devvit_test:events:recent50');
    expect(entry.score).toBe(1_000_000);

    const parsed = JSON.parse(entry.member);
    expect(parsed.v).toBe(1);
    expect(typeof parsed.nonce).toBe('string');
    expect(parsed.nonce.length).toBeGreaterThan(0);
    expect(parsed.activityId).toBe('t3_abc');
    expect(parsed.actions).toEqual([{ kind: 'remove', ok: true }]);
  });

  it('keeps only the last 50 entries', async () => {
    await recordEvent({
      ts: 1, activityId: 'x', runName: 'r', checkName: 'c',
      triggered: true, actions: [],
    });
    expect(zRemRangeByRank).toHaveBeenCalledWith(expect.any(String), 0, -51);
  });

  it('two same-ms calls produce distinct members (nonce dedupe-break)', async () => {
    const base = { ts: 5, activityId: 't3_x', runName: 'r', checkName: 'c', triggered: true, actions: [] };
    await recordEvent(base);
    await recordEvent(base);
    const m1 = (zAdd.mock.calls[0]![1] as { member: string }).member;
    const m2 = (zAdd.mock.calls[1]![1] as { member: string }).member;
    expect(m1).not.toBe(m2);
  });

  it('swallows redis errors (best-effort write)', async () => {
    zAdd.mockRejectedValueOnce(new Error('redis down'));
    await expect(recordEvent({
      ts: 1, activityId: 'x', runName: 'r', checkName: 'c', triggered: true, actions: [],
    })).resolves.toBeUndefined();
  });
});
