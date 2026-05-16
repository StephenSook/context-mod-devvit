/**
 * Phase 2.5 — Step 2.5.1 gate: URL-dedupe repost rule.
 *   - first submission: writes a sub-scoped seen-marker, does NOT trigger
 *   - second submission: marker present → trigger + TTL refresh
 *   - empty URL: no-op
 *   - redis error: fail-OPEN (no false-positive removals during outage)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const redisGet = vi.fn();
const redisSet = vi.fn().mockResolvedValue('OK');

vi.mock('@devvit/web/server', () => ({
  redis: {
    get: (...a: unknown[]) => redisGet(...a),
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
  redisGet.mockReset();
  redisSet.mockClear();
  redisSet.mockResolvedValue('OK');
});

describe('runRepostRule', () => {
  it('returns triggered=false and writes seen-marker on first submission', async () => {
    redisGet.mockResolvedValueOnce(null);
    const res = await runRepostRule(rule, item('https://x.example/a'), 'sub1');
    expect(res).toEqual({ triggered: false });
    expect(redisSet).toHaveBeenCalledTimes(1);
    const [key, value] = redisSet.mock.calls[0] as [string, string, unknown];
    expect(key).toMatch(/^cm:sub1:repost:url:[0-9a-f]{16}$/);
    expect(value).toBe('t3_abc');
  });

  it('triggers when the seen-marker exists', async () => {
    redisGet.mockResolvedValueOnce('t3_previous');
    const res = await runRepostRule(rule, item('https://x.example/a'), 'sub1');
    expect(res).toEqual({ triggered: true });
  });

  it('refreshes TTL on a hit so repeat reposts dont expire mid-window', async () => {
    redisGet.mockResolvedValueOnce('t3_previous');
    await runRepostRule(rule, item('https://x.example/a'), 'sub1');
    expect(redisSet).toHaveBeenCalledTimes(1);
    const opts = redisSet.mock.calls[0]![2] as { expiration: Date };
    expect(opts.expiration).toBeInstanceOf(Date);
    expect(opts.expiration.getTime()).toBeGreaterThan(Date.now());
  });

  it('sub-scopes the redis key so cross-sub repost markers do not alias', async () => {
    redisGet.mockResolvedValue(null);
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
    expect(redisGet).not.toHaveBeenCalled();
    expect(redisSet).not.toHaveBeenCalled();
  });

  it('fails OPEN on redis error (no trigger — bias away from mass false-positives)', async () => {
    redisGet.mockRejectedValueOnce(new Error('redis down'));
    const res = await runRepostRule(rule, item('https://x.example/a'), 'sub1');
    expect(res).toEqual({ triggered: false });
  });

  it('honors a custom windowDays', async () => {
    redisGet.mockResolvedValueOnce(null);
    await runRepostRule({ kind: 'repost', windowDays: 7 }, item('https://x.example/a'), 'sub1');
    const opts = redisSet.mock.calls[0]![2] as { expiration: Date };
    const sevenDaysMs = 7 * 86_400 * 1000;
    const expected = Date.now() + sevenDaysMs;
    // within 2s tolerance for test timing
    expect(Math.abs(opts.expiration.getTime() - expected)).toBeLessThan(2_000);
  });
});
