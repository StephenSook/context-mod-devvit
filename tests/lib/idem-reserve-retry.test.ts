/**
 * W3 regression — reserveAction retries NX-set on LOCK_FAIL before giving up.
 *
 * Without the retry, a transient Redis blip during reserveAction would
 * silently drop the moderation action: firstSeen (24h NX) is already set,
 * so the next trigger for the same thingId returns firstSeen=false and skips
 * — the action is permanently lost with only a console.error.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const redisSet = vi.fn();
const redisGet = vi.fn();
const redisDel = vi.fn();

vi.mock('@devvit/web/server', () => ({
  redis: {
    set: (...a: unknown[]) => redisSet(...a),
    get: (...a: unknown[]) => redisGet(...a),
    del: (...a: unknown[]) => redisDel(...a),
  },
}));

import { reserveAction } from '../../src/lib/idem';

beforeEach(() => {
  redisSet.mockReset();
  redisGet.mockReset();
  redisDel.mockReset();
});

describe('reserveAction LOCK_FAIL retry (W3)', () => {
  it('retries NX-set up to 3 attempts on transient Redis error', async () => {
    redisSet
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce('OK');
    redisGet.mockResolvedValueOnce(null);
    const result = await reserveAction('aid_xyz', 'r_test');
    expect(result).not.toBeNull();
    expect(result?.token).toMatch(/^\d+-[a-z0-9]+$/);
    expect(redisSet).toHaveBeenCalledTimes(3);
  });

  it('returns null after exhausting all retries (action dropped, dashboard surfaces skipped-locked)', async () => {
    redisSet
      .mockRejectedValueOnce(new Error('redis down'))
      .mockRejectedValueOnce(new Error('redis down'))
      .mockRejectedValueOnce(new Error('redis down'));
    const result = await reserveAction('aid_xyz', 'r_test');
    expect(result).toBeNull();
    expect(redisSet).toHaveBeenCalledTimes(3);
    expect(redisGet).not.toHaveBeenCalled();
  });

  it('returns null without retry when NX-set succeeds but reports already-locked', async () => {
    redisSet.mockResolvedValueOnce(null);
    const result = await reserveAction('aid_xyz', 'r_test');
    expect(result).toBeNull();
    expect(redisSet).toHaveBeenCalledTimes(1);
    expect(redisGet).not.toHaveBeenCalled();
  });

  it('skips action + cleans up own lease when done-marker is present (lock-then-check race winner)', async () => {
    redisSet.mockResolvedValueOnce('OK');
    redisGet
      .mockResolvedValueOnce('1')
      .mockImplementationOnce(async () => {
        return (redisSet.mock.calls[0]![1]) as string;
      });
    const result = await reserveAction('aid_xyz', 'r_test');
    expect(result).toBeNull();
    expect(redisDel).toHaveBeenCalledTimes(1);
  });

  it('returns null on ORPHANED_LEASE when done-read throws (lease TTL reaps)', async () => {
    redisSet.mockResolvedValueOnce('OK');
    redisGet.mockRejectedValueOnce(new Error('redis read fail'));
    const result = await reserveAction('aid_xyz', 'r_test');
    expect(result).toBeNull();
    expect(redisSet).toHaveBeenCalledTimes(1);
    expect(redisDel).not.toHaveBeenCalled();
  });
});
