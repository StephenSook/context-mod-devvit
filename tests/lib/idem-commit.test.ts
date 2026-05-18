/**
 * Codex CRITICAL 2026-05-16 — commitAction must NOT release the pending lease
 * when the done-marker write fails. Otherwise a retry sees neither marker and
 * fires the side-effect again (double mod action).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const redisSet = vi.fn().mockResolvedValue('OK');
const redisDel = vi.fn().mockResolvedValue(undefined);
const redisGet = vi.fn().mockResolvedValue('tk-test');

vi.mock('@devvit/web/server', () => ({
  redis: {
    set: (...a: unknown[]) => redisSet(...a),
    del: (...a: unknown[]) => redisDel(...a),
    get: (...a: unknown[]) => redisGet(...a),
  },
}));

import { commitAction } from '../../src/lib/idem';

beforeEach(() => {
  redisSet.mockReset();
  redisDel.mockReset();
  redisGet.mockReset();
  redisSet.mockResolvedValue('OK');
  redisDel.mockResolvedValue(undefined);
  redisGet.mockResolvedValue('tk-test');
});

describe('commitAction — done-marker durability + pending-lease safety', () => {
  it('happy path: writes done marker then deletes pending', async () => {
    await commitAction('abc', 'tk-test', 'sub1');

    expect(redisSet).toHaveBeenCalledTimes(1);
    expect(redisDel).toHaveBeenCalledTimes(1);
    const [doneKey] = redisSet.mock.calls[0] as [string];
    const [pendingKey] = redisDel.mock.calls[0] as [string];
    expect(doneKey).toContain(':done:');
    expect(pendingKey).toContain(':pending:');
  });

  it('retries done-marker write 3x on failure with backoff', async () => {
    redisSet
      .mockRejectedValueOnce(new Error('redis hiccup 1'))
      .mockRejectedValueOnce(new Error('redis hiccup 2'))
      .mockResolvedValueOnce('OK');

    await commitAction('abc', 'tk-test', 'sub1');

    expect(redisSet).toHaveBeenCalledTimes(3);
    // Pending deleted because we eventually succeeded
    expect(redisDel).toHaveBeenCalledTimes(1);
  });

  it('throws + does NOT delete pending lease when done-marker write persistently fails', async () => {
    // mockImplementation avoids eager rejected-promise creation that
    // mockRejectedValueOnce produces (which vitest flags as unhandled even when
    // ultimately awaited inside our retry loop).
    redisSet.mockImplementation(async () => {
      throw new Error('redis down hard');
    });

    await expect(commitAction('abc', 'tk-test', 'sub1')).rejects.toThrow(/redis down hard/);
    expect(redisSet).toHaveBeenCalledTimes(3); // attempted retries
    // SAFETY: pending lease must NOT be deleted — otherwise the next retry
    // path would see neither marker and fire the side-effect AGAIN.
    expect(redisDel).not.toHaveBeenCalled();
  });

  it('done write success but pending del failure is harmless (TTL reaps)', async () => {
    redisSet.mockResolvedValueOnce('OK');
    redisDel.mockRejectedValueOnce(new Error('del failed'));

    await expect(commitAction('abc', 'tk-test', 'sub1')).resolves.toBeUndefined();
  });

  it('Codex C2 — pending del is no-op when token mismatches (successor lease protected)', async () => {
    // Worker A's TTL expired, Worker B took over with a new token. A finally
    // completes side-effect + commitAction. The pending key now holds B's
    // token. A must NOT delete B's lease (would allow a third execution).
    redisSet.mockResolvedValueOnce('OK'); // done write succeeds
    redisGet.mockResolvedValueOnce('different-token-from-B'); // pending owned by B

    await commitAction('abc', 'tk-A', 'sub1');

    expect(redisSet).toHaveBeenCalledTimes(1); // done marker
    expect(redisGet).toHaveBeenCalledTimes(1); // token check
    expect(redisDel).not.toHaveBeenCalled(); // B's lease NOT deleted
  });
});
