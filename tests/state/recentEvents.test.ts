/**
 * Phase 2 supporting gate: recordEvent writes a v1-stamped JSON member to the
 * events:recent50 ZSET, scored by ts, and trims to the most-recent 50.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const zAdd = vi.fn().mockResolvedValue(1);
const zRemRangeByRank = vi.fn().mockResolvedValue(0);
const zRange = vi.fn().mockResolvedValue([]);

vi.mock('@devvit/web/server', () => ({
  redis: {
    zAdd: (...a: unknown[]) => zAdd(...a),
    zRemRangeByRank: (...a: unknown[]) => zRemRangeByRank(...a),
    zRange: (...a: unknown[]) => zRange(...a),
  },
}));

import { recordEvent, readRecent } from '../../src/state/recentEvents';

beforeEach(() => {
  zAdd.mockClear();
  zRemRangeByRank.mockClear();
  zRange.mockReset();
  zRange.mockResolvedValue([]);
});

describe('recordEvent', () => {
  it('writes a v1 + nonce-stamped JSON member, scored by ts, to the sub-scoped key', async () => {
    await recordEvent(
      {
        ts: 1_000_000,
        activityId: 't3_abc',
        runName: 'main',
        checkName: 'spam',
        triggered: true,
        actions: [{ kind: 'remove', ok: true }],
      },
      'cm_devvit_test'
    );

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
      ts: 1,
      activityId: 'x',
      runName: 'r',
      checkName: 'c',
      triggered: true,
      actions: [],
    });
    expect(zRemRangeByRank).toHaveBeenCalledWith(expect.any(String), 0, -51);
  });

  it('two same-ms calls produce distinct members (nonce dedupe-break)', async () => {
    const base = {
      ts: 5,
      activityId: 't3_x',
      runName: 'r',
      checkName: 'c',
      triggered: true,
      actions: [],
    };
    await recordEvent(base);
    await recordEvent(base);
    const m1 = (zAdd.mock.calls[0]![1] as { member: string }).member;
    const m2 = (zAdd.mock.calls[1]![1] as { member: string }).member;
    expect(m1).not.toBe(m2);
  });

  it('swallows redis errors (best-effort write)', async () => {
    zAdd.mockRejectedValueOnce(new Error('redis down'));
    await expect(
      recordEvent({
        ts: 1,
        activityId: 'x',
        runName: 'r',
        checkName: 'c',
        triggered: true,
        actions: [],
      })
    ).resolves.toBeUndefined();
  });
});

describe('readRecent', () => {
  it('reads the sub-scoped key, newest first, by rank', async () => {
    zRange.mockResolvedValueOnce([
      {
        score: 100,
        member: JSON.stringify({
          v: 1,
          nonce: 'n',
          ts: 100,
          activityId: 't3_a',
          runName: 'r',
          checkName: 'c',
          triggered: true,
          actions: [],
        }),
      },
    ]);
    const out = await readRecent('cm_devvit_test');
    expect(zRange).toHaveBeenCalledWith('cm:cm_devvit_test:events:recent50', 0, 49, {
      by: 'rank',
      reverse: true,
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.activityId).toBe('t3_a');
  });

  it('drops members that fail JSON.parse without poisoning the batch', async () => {
    zRange.mockResolvedValueOnce([
      { score: 1, member: 'not-json-at-all' },
      {
        score: 2,
        member: JSON.stringify({
          v: 1,
          nonce: 'n',
          ts: 2,
          activityId: 't3_b',
          runName: 'r',
          checkName: 'c',
          triggered: true,
          actions: [],
        }),
      },
    ]);
    const out = await readRecent();
    expect(out).toHaveLength(1);
    expect(out[0]?.activityId).toBe('t3_b');
  });

  it('drops members with an unknown future version (loud, not silent)', async () => {
    zRange.mockResolvedValueOnce([
      {
        score: 1,
        member: JSON.stringify({ v: 99, ts: 1, activityId: 'future' }),
      },
      {
        score: 2,
        member: JSON.stringify({
          v: 1,
          nonce: 'n',
          ts: 2,
          activityId: 't3_b',
          runName: 'r',
          checkName: 'c',
          triggered: true,
          actions: [],
        }),
      },
    ]);
    const out = await readRecent();
    expect(out).toHaveLength(1);
    expect(out[0]?.activityId).toBe('t3_b');
  });

  it('AE Polish #16: pre-v1 events (missing v field) are dropped, not back-stamped', async () => {
    // Pre-v1 back-stamp path was removed 2026-05-18 — every install since
    // Phase 2.3 has written v:1-stamped events. A pre-v1 row in production
    // today would be a corruption signal, not a legitimate migration case;
    // drop it loudly rather than re-mint nonces on every read.
    zRange.mockResolvedValueOnce([
      {
        score: 1,
        member: JSON.stringify({
          ts: 1,
          activityId: 't3_old',
          runName: 'r',
          checkName: 'c',
          triggered: true,
          actions: [],
        }),
      },
    ]);
    const out = await readRecent();
    expect(out).toHaveLength(0);
  });

  it('returns [] on redis error (best-effort read)', async () => {
    zRange.mockRejectedValueOnce(new Error('redis down'));
    const out = await readRecent();
    expect(out).toEqual([]);
  });

  it('AE Polish #5: drops v1 events w/ poisoned actions:"not-array" instead of crashing /api/stats', async () => {
    zRange.mockResolvedValueOnce([
      {
        score: 1,
        member: JSON.stringify({
          v: 1,
          nonce: 'n',
          ts: 1,
          activityId: 't3_a',
          runName: 'r',
          checkName: 'c',
          triggered: true,
          actions: 'not-an-array',
        }),
      },
      {
        score: 2,
        member: JSON.stringify({
          v: 1,
          nonce: 'n2',
          ts: 2,
          activityId: 't3_b',
          runName: 'r',
          checkName: 'c',
          triggered: true,
          actions: [{ kind: 'remove', ok: true }],
        }),
      },
    ]);
    const out = await readRecent();
    expect(out).toHaveLength(1);
    expect(out[0]?.activityId).toBe('t3_b');
  });

  it('AE Polish #5: drops v1 events w/ malformed action items (missing kind field)', async () => {
    zRange.mockResolvedValueOnce([
      {
        score: 1,
        member: JSON.stringify({
          v: 1,
          nonce: 'n',
          ts: 1,
          activityId: 't3_bad',
          runName: 'r',
          checkName: 'c',
          triggered: true,
          actions: [{ ok: true }],
        }),
      },
    ]);
    const out = await readRecent();
    expect(out).toHaveLength(0);
  });

  // AE Polish #93: gap caught by pr-test-analyzer. Polish #67 split
  // recordEvent's single try into two — zAdd in one (logs "event
  // dropped" on fail) and zRemRangeByRank in a second (logs "trim
  // deferred"). The new split-branch path where zAdd SUCCEEDS but
  // trim FAILS had no test. A regression collapsing the splits would
  // re-introduce the misleading "event dropped" log when the event
  // was actually persisted.
  it('Polish #67: zAdd success + trim failure resolves (event persisted, trim deferred)', async () => {
    zAdd.mockResolvedValueOnce(1);
    zRemRangeByRank.mockRejectedValueOnce(new Error('trim transient redis err'));
    await expect(
      recordEvent({
        ts: Date.now(),
        activityId: 't3_z',
        runName: 'r',
        checkName: 'c',
        triggered: true,
        actions: [{ kind: 'remove', ok: true }],
      })
    ).resolves.toBeUndefined();
    // Both calls fired (zAdd before the fail). Importantly, the trim
    // failure didn't bubble — recordEvent stayed best-effort.
    expect(zAdd).toHaveBeenCalledTimes(1);
    expect(zRemRangeByRank).toHaveBeenCalledTimes(1);
  });
});
