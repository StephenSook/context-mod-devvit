/**
 * X38: retry-with-jitter helper for external HTTP calls that may
 * transiently fail (Reddit API blips, OpenAI 5xx) but aren't expected
 * to need the full circuit-breaker treatment for one-shot operations.
 *
 * Why jitter: thundering-herd protection. If 30 cron workers all backed
 * off by exactly 500ms, they'd all retry simultaneously and re-overwhelm
 * the upstream. Adding +/- 25% jitter spreads them across a ~250ms band.
 *
 * Why not a full circuit breaker: this is per-call retry-with-backoff, not
 * a shared cross-request state machine. Use checkCircuit() for that — see
 * src/lib/circuitBreaker.ts.
 */

export interface RetryOpts {
  /** Max attempts INCLUDING the first one. Defaults to 3. */
  maxAttempts?: number;
  /** Base backoff in ms. Doubles each attempt. Defaults to 100. */
  baseMs?: number;
  /** Jitter fraction (0..1). Defaults to 0.25 → +/- 25% randomized. */
  jitter?: number;
  /** Predicate: return true to retry; return false to give up early. */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
}

/**
 * Retry an async operation with exponential backoff + jitter. Throws the
 * last error if all attempts fail.
 */
export async function retryWithJitter<T>(op: () => Promise<T>, opts: RetryOpts = {}): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseMs = opts.baseMs ?? 100;
  const jitter = opts.jitter ?? 0.25;
  const shouldRetry = opts.shouldRetry ?? (() => true);

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await op();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) break;
      if (!shouldRetry(err, attempt)) break;
      const backoff = baseMs * 2 ** (attempt - 1);
      const jitterBand = backoff * jitter;
      const sleep = backoff + (Math.random() * 2 - 1) * jitterBand;
      await new Promise((r) => setTimeout(r, Math.max(0, sleep)));
    }
  }
  throw lastErr;
}
