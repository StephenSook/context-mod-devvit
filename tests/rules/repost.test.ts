/**
 * Phase 2.5 — Step 2.5.1 gate: URL-dedupe repost rule (race-safe SET NX, Codex HIGH fix).
 *   - first submission: SET NX returns 'OK' → no trigger, 1 set call (NX with TTL)
 *   - second submission: SET NX returns non-OK → trigger + TTL refresh (2 set calls)
 *   - empty URL: no-op
 *   - redis error: fail-OPEN (no false-positive removals during outage)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const redisSet = vi.fn().mockResolvedValue('OK');

vi.mock('@devvit/web/server', () => ({
  redis: {
    set: (...a: unknown[]) => redisSet(...a),
  },
}));

import { runRepostRule } from '../../src/rules/repost';
import type { Item, RepostRule } from '../../src/shared/types';

const item = (url: string): Item => ({
  id: 't3_abc', title: '', body: '', url, author: 'u', age: 0, score: 0,
  isSelf: false, over18: false, removed: false, approved: false,
  locked: false, stickied: false, linkFlairText: null,
});

const rule: RepostRule = { kind: 'repost' };

beforeEach(() => {
  redisSet.mockReset();
  redisSet.mockResolvedValue('OK');
});

describe('runRepostRule', () => {
  it('returns triggered=false and writes seen-marker NX on first submission', async () => {
    const res = await runRepostRule(rule, item('https://x.example/a'), 'sub1');
    expect(res).toEqual({ triggered: false });
    expect(redisSet).toHaveBeenCalledTimes(1);
    const [key, value, opts] = redisSet.mock.calls[0] as [string, string, { nx: boolean; expiration: Date }];
    expect(key).toMatch(/^cm:sub1:repost:url:[0-9a-f]{16}$/);
    expect(value).toBe('t3_abc');
    expect(opts.nx).toBe(true);
  });

  it('triggers when SET NX returns non-OK (key already exists — race-safe)', async () => {
    // Codex HIGH 2026-05-16: prior GET-then-SET pattern raced concurrent
    // submissions. Single atomic SET NX returns non-OK iff key existed.
    redisSet.mockResolvedValueOnce(null);  // NX failed → existing key
    const res = await runRepostRule(rule, item('https://x.example/a'), 'sub1');
    expect(res).toEqual({ triggered: true });
    expect(redisSet).toHaveBeenCalledTimes(2);  // NX attempt + non-NX refresh
  });

  it('refreshes TTL on a hit so repeat reposts dont expire mid-window', async () => {
    redisSet.mockResolvedValueOnce(null);  // NX failed
    redisSet.mockResolvedValueOnce('OK');  // refresh
    await runRepostRule(rule, item('https://x.example/a'), 'sub1');
    const refreshOpts = redisSet.mock.calls[1]![2] as { nx?: boolean; expiration: Date };
    expect(refreshOpts.nx).toBeUndefined();
    expect(refreshOpts.expiration).toBeInstanceOf(Date);
    expect(refreshOpts.expiration.getTime()).toBeGreaterThan(Date.now());
  });

  it('sub-scopes the redis key so cross-sub repost markers do not alias', async () => {
    await runRepostRule(rule, item('https://x.example/a'), 'sub_a');
    await runRepostRule(rule, item('https://x.example/a'), 'sub_b');
    const k1 = redisSet.mock.calls[0]![0] as string;
    const k2 = redisSet.mock.calls[1]![0] as string;
    expect(k1).toContain(':sub_a:');
    expect(k2).toContain(':sub_b:');
    expect(k1).not.toBe(k2);
  });

  it('no-ops on an empty URL', async () => {
    const res = await runRepostRule(rule, item(''), 'sub1');
    expect(res).toEqual({ triggered: false });
    expect(redisSet).not.toHaveBeenCalled();
  });

  it('fails OPEN on redis error (no trigger — bias away from mass false-positives)', async () => {
    redisSet.mockRejectedValueOnce(new Error('redis down'));
    const res = await runRepostRule(rule, item('https://x.example/a'), 'sub1');
    expect(res).toEqual({ triggered: false });
  });

  it('honors a custom windowDays', async () => {
    await runRepostRule({ kind: 'repost', windowDays: 7 }, item('https://x.example/a'), 'sub1');
    const opts = redisSet.mock.calls[0]![2] as { expiration: Date };
    const sevenDaysMs = 7 * 86_400 * 1000;
    const expected = Date.now() + sevenDaysMs;
    expect(Math.abs(opts.expiration.getTime() - expected)).toBeLessThan(2_000);
  });
});
