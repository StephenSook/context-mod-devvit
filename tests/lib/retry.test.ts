/**
 * X38 — retry-with-jitter contract.
 */

import { describe, it, expect, vi } from 'vitest';
import { retryWithJitter } from '../../src/lib/retry';

describe('retryWithJitter (X38)', () => {
  it('returns value on first success', async () => {
    const op = vi.fn(async () => 'ok');
    const r = await retryWithJitter(op);
    expect(r).toBe('ok');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('retries up to maxAttempts on throw', async () => {
    let count = 0;
    const op = vi.fn(async () => {
      count++;
      if (count < 3) throw new Error('transient');
      return 'finally';
    });
    const r = await retryWithJitter(op, { maxAttempts: 3, baseMs: 1 });
    expect(r).toBe('finally');
    expect(op).toHaveBeenCalledTimes(3);
  });

  it('throws last error when all attempts fail', async () => {
    const op = vi.fn(async () => {
      throw new Error('persistent');
    });
    await expect(retryWithJitter(op, { maxAttempts: 3, baseMs: 1 })).rejects.toThrow('persistent');
    expect(op).toHaveBeenCalledTimes(3);
  });

  it('shouldRetry predicate can bail out early', async () => {
    const op = vi.fn(async () => {
      throw new Error('do-not-retry');
    });
    await expect(
      retryWithJitter(op, {
        maxAttempts: 5,
        baseMs: 1,
        shouldRetry: () => false,
      })
    ).rejects.toThrow();
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('passes attempt number to shouldRetry', async () => {
    const seen: number[] = [];
    const op = vi.fn(async () => {
      throw new Error('x');
    });
    await expect(
      retryWithJitter(op, {
        maxAttempts: 4,
        baseMs: 1,
        shouldRetry: (_e, attempt) => {
          seen.push(attempt);
          return attempt < 2;
        },
      })
    ).rejects.toThrow();
    expect(seen).toEqual([1, 2]);
    // op runs once per iteration; shouldRetry decides whether to enter the
    // next iteration. attempt=1 → retry → attempt=2 → bail. 2 op calls.
    expect(op).toHaveBeenCalledTimes(2);
  });
});
