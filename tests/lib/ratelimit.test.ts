/**
 * X1 — fixed-window Redis token bucket. Tested in isolation so the contract
 * (allowed=false past max, TTL set on first call, fail-open on Redis blip)
 * is pinned independent of any caller.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const redisIncrBy = vi.fn();
const redisExpire = vi.fn();

vi.mock('@devvit/web/server', () => ({
  redis: {
    incrBy: (...a: unknown[]) => redisIncrBy(...a),
    expire: (...a: unknown[]) => redisExpire(...a),
  },
}));

import { checkRateLimit } from '../../src/lib/ratelimit';

beforeEach(() => {
  redisIncrBy.mockReset();
  redisExpire.mockReset();
});

describe('checkRateLimit (X1)', () => {
  it('allows first call + sets TTL', async () => {
    redisIncrBy.mockResolvedValue(1);
    const r = await checkRateLimit('explain', 'r_test', 30, 3600);
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(1);
    expect(redisExpire).toHaveBeenCalledWith('cm:rl:explain:r_test', 3600);
  });

  it('allows up to max calls', async () => {
    redisIncrBy.mockResolvedValue(30);
    const r = await checkRateLimit('explain', 'r_test', 30, 3600);
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(30);
  });

  it('denies past max', async () => {
    redisIncrBy.mockResolvedValue(31);
    const r = await checkRateLimit('explain', 'r_test', 30, 3600);
    expect(r.allowed).toBe(false);
    expect(r.count).toBe(31);
  });

  it('does NOT reset TTL on subsequent calls (window is fixed)', async () => {
    redisIncrBy.mockResolvedValue(5);
    await checkRateLimit('explain', 'r_test', 30, 3600);
    expect(redisExpire).not.toHaveBeenCalled();
  });

  it('fails OPEN on Redis blip (allows the call through)', async () => {
    redisIncrBy.mockRejectedValue(new Error('redis offline'));
    const r = await checkRateLimit('explain', 'r_test', 30, 3600);
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(0);
  });

  it('isolates buckets per sub', async () => {
    redisIncrBy.mockResolvedValue(1);
    await checkRateLimit('explain', 'sub_a', 30, 3600);
    await checkRateLimit('explain', 'sub_b', 30, 3600);
    expect(redisIncrBy).toHaveBeenNthCalledWith(1, 'cm:rl:explain:sub_a', 1);
    expect(redisIncrBy).toHaveBeenNthCalledWith(2, 'cm:rl:explain:sub_b', 1);
  });
});
