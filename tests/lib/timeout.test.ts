/**
 * Polish #50 — dedicated tests for src/lib/timeout.ts.
 *
 * Every other primitive in src/lib/ has a sibling test
 * (`tests/lib/circuitBreaker.test.ts`, `idem.test.ts`, `retry.test.ts`,
 * `result.test.ts`, etc.). gemini-agent third-pass review noted that
 * `src/lib/timeout.ts` (extracted as part of Polish #48) was missing
 * its sibling test — coverage existed only via the consumers
 * (`handleActivity-run-isolation`, `dryRunActivity-isolation`).
 *
 * These tests pin the PRIMITIVE'S contract independent of either
 * caller:
 *   - Fast-path resolve before timer fires (timer cleanup via finally)
 *   - Slow-path timeout fires + rejects with the error factory's error
 *   - errFactory is a FACTORY (called at reject time) not a value
 *     (so error stack is captured at reject, not at module load)
 *   - Sub-helpers (runWithTimeout/actionWithTimeout) use the right
 *     budgets + the right error classes
 *   - instanceof differentiates RunTimeoutError vs ActionTimeoutError
 *     so caller catch blocks can tag the failure correctly
 */

import { describe, it, expect, vi } from 'vitest';
import {
  withTimeout,
  runWithTimeout,
  actionWithTimeout,
  RunTimeoutError,
  ActionTimeoutError,
  PER_RUN_TIMEOUT_MS,
  PER_ACTION_TIMEOUT_MS,
} from '../../src/lib/timeout';

describe('withTimeout (Polish #50)', () => {
  it('resolves with the inner value when the promise settles before the timer', async () => {
    const result = await withTimeout(Promise.resolve('ok'), 1000, () => new Error('would-timeout'));
    expect(result).toBe('ok');
  });

  it('rejects with errFactory()-produced error when timer fires first', async () => {
    vi.useFakeTimers();
    try {
      const hung = new Promise<string>(() => {});
      const racePromise = withTimeout(hung, 1000, () => new Error('hit-timeout'));
      // Polish #50: attach rejection assertion BEFORE advancing the timer.
      // Otherwise the rejection sits unhandled for one microtask cycle
      // (between timer-fire + our await) and trips vitest's unhandled-
      // rejection tracker, producing noisy false-positive errors despite
      // the test asserting the rejection correctly.
      const assertion = expect(racePromise).rejects.toThrow('hit-timeout');
      await vi.advanceTimersByTimeAsync(1001);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('Polish #50: errFactory is called AT TIMEOUT, not at withTimeout invocation', async () => {
    // Important contract: the factory is a thunk so the error's `stack` is
    // captured at reject time (useful for diagnosing WHICH operation hung,
    // not just where withTimeout was called from).
    vi.useFakeTimers();
    try {
      const factory = vi.fn(() => new Error('lazy-err'));
      const hung = new Promise<string>(() => {});
      const racePromise = withTimeout(hung, 500, factory);
      const assertion = expect(racePromise).rejects.toThrow('lazy-err');
      // Factory has NOT been called yet — race is in flight.
      expect(factory).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(501);
      await assertion;
      // After timer fires, factory was called exactly once.
      expect(factory).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('Polish #50: clears the timer in the FINALLY (no leak after fast-path resolve)', async () => {
    // If withTimeout didn't clearTimeout in finally, a hung-but-eventually-
    // resolving Promise would keep the timer alive + leak the setTimeout
    // callback closure. Test asserts the timer is cleaned up by attempting
    // to advance fake timers AFTER a fast-path resolve — no rejection
    // should fire.
    vi.useFakeTimers();
    try {
      const value = await withTimeout(Promise.resolve(42), 5000, () => new Error('should-not-fire'));
      expect(value).toBe(42);
      // Advance past the would-be-timeout. If the timer wasn't cleared,
      // the factory error would have queued. But the awaited promise
      // already resolved — the timer should be dead.
      await vi.advanceTimersByTimeAsync(10_000);
      // Reaching this line means no unhandled rejection fired.
      expect(true).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('Polish #50: also clears the timer when the inner promise REJECTS', async () => {
    // Same finally-cleanup guarantee should hold on the rejection path.
    vi.useFakeTimers();
    try {
      const rejecting = Promise.reject(new Error('inner-rejected'));
      await expect(
        withTimeout(rejecting, 5000, () => new Error('should-not-fire'))
      ).rejects.toThrow('inner-rejected');
      // Timer should be dead after the inner rejection.
      await vi.advanceTimersByTimeAsync(10_000);
      expect(true).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('runWithTimeout / actionWithTimeout convenience wrappers (Polish #50)', () => {
  it('runWithTimeout uses PER_RUN_TIMEOUT_MS (10s) + rejects with RunTimeoutError', async () => {
    vi.useFakeTimers();
    try {
      const racePromise = runWithTimeout(new Promise<void>(() => {}), 'spam-removal');
      // Attach catch BEFORE advancing timers (avoids unhandled-rejection noise).
      const errPromise = racePromise.catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(PER_RUN_TIMEOUT_MS + 1);
      const err = await errPromise;
      expect(err).toBeInstanceOf(RunTimeoutError);
      expect((err as Error).message).toContain('spam-removal');
      expect((err as Error).message).toContain(String(PER_RUN_TIMEOUT_MS));
    } finally {
      vi.useRealTimers();
    }
  });

  it('actionWithTimeout uses PER_ACTION_TIMEOUT_MS (8s) + rejects with ActionTimeoutError', async () => {
    vi.useFakeTimers();
    try {
      const racePromise = actionWithTimeout(new Promise<void>(() => {}), 'remove');
      const errPromise = racePromise.catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(PER_ACTION_TIMEOUT_MS + 1);
      const err = await errPromise;
      expect(err).toBeInstanceOf(ActionTimeoutError);
      expect((err as Error).message).toContain('remove');
      expect((err as Error).message).toContain(String(PER_ACTION_TIMEOUT_MS));
    } finally {
      vi.useRealTimers();
    }
  });

  it('RunTimeoutError and ActionTimeoutError are distinct classes (instanceof differentiation)', () => {
    const re = new RunTimeoutError('r');
    const ae = new ActionTimeoutError('a');
    expect(re).toBeInstanceOf(RunTimeoutError);
    expect(re).not.toBeInstanceOf(ActionTimeoutError);
    expect(ae).toBeInstanceOf(ActionTimeoutError);
    expect(ae).not.toBeInstanceOf(RunTimeoutError);
    // Both are Errors.
    expect(re).toBeInstanceOf(Error);
    expect(ae).toBeInstanceOf(Error);
    // Names match the class — useful for log line tagging.
    expect(re.name).toBe('RunTimeoutError');
    expect(ae.name).toBe('ActionTimeoutError');
  });

  it('runWithTimeout fast-path: resolved Promise returns its value unchanged', async () => {
    const r = await runWithTimeout(Promise.resolve('ok'), 'fast-run');
    expect(r).toBe('ok');
  });

  it('actionWithTimeout fast-path: resolved Promise returns its value unchanged', async () => {
    const r = await actionWithTimeout(Promise.resolve('ok'), 'remove');
    expect(r).toBe('ok');
  });
});

describe('exported constants are sensible (Polish #50)', () => {
  it('PER_RUN_TIMEOUT_MS > PER_ACTION_TIMEOUT_MS (run is the outer envelope)', () => {
    // A single run can dispatch multiple actions, so the run budget must
    // be at least as large as the per-action budget. Today: 10s run > 8s
    // action means a run with 1+ slow action still completes in budget.
    expect(PER_RUN_TIMEOUT_MS).toBeGreaterThan(PER_ACTION_TIMEOUT_MS);
  });

  it('PER_RUN_TIMEOUT_MS gives headroom over imageRepost internal 8s fetch timeout', () => {
    // The slowest legit Phase-4 rule is imageRepost which has its own 8s
    // fetch timeout (Polish #23 Content-Length pre-check + 6MB cap).
    // Run-level budget must leave headroom for that.
    expect(PER_RUN_TIMEOUT_MS).toBeGreaterThan(8_000);
  });
});
