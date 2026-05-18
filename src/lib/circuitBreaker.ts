/**
 * X37: simple Redis-backed circuit breaker for external HTTP calls.
 *
 * State machine:
 *   CLOSED   — normal, all calls go through. Failures incr counter.
 *   OPEN     — too many failures, all calls reject. After OPEN_SEC, becomes HALF_OPEN.
 *   HALF_OPEN — one probe allowed; success → CLOSED + reset, failure → re-OPEN.
 *
 * Devvit Redis lacks SETEX-with-NX-and-comparator, so the HALF_OPEN state
 * is computed (opened_at + OPEN_SEC has elapsed) rather than stored.
 *
 * Fails OPEN on Redis blip (allow the call) — same calculus as ratelimit.ts:
 * better to let the underlying API surface the failure than block on infra.
 */

import { redis } from '@devvit/web/server';

const DEFAULT_THRESHOLD = 5;
const DEFAULT_OPEN_SEC = 60;

function failKey(bucket: string): string {
  return `cm:cb:${bucket}:failures`;
}
function openedKey(bucket: string): string {
  return `cm:cb:${bucket}:opened-at`;
}

export interface BreakerCheck {
  state: 'closed' | 'open' | 'half-open';
  /** When state==='open', seconds until probe is allowed. */
  retryInSec?: number;
}

export async function checkCircuit(
  bucket: string,
  opts: { openSec?: number } = {},
): Promise<BreakerCheck> {
  const openSec = opts.openSec ?? DEFAULT_OPEN_SEC;
  try {
    const openedAt = await redis.get(openedKey(bucket));
    if (!openedAt) return { state: 'closed' };
    const elapsedMs = Date.now() - Number.parseInt(openedAt, 10);
    if (elapsedMs >= openSec * 1000) return { state: 'half-open' };
    return { state: 'open', retryInSec: Math.ceil((openSec * 1000 - elapsedMs) / 1000) };
  } catch (err) {
    console.warn('[cm/circuitBreaker] check failed (fail-open):', bucket, err);
    return { state: 'closed' };
  }
}

export async function recordFailure(
  bucket: string,
  opts: { threshold?: number; openSec?: number } = {},
): Promise<void> {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const openSec = opts.openSec ?? DEFAULT_OPEN_SEC;
  try {
    const failures = await redis.incrBy(failKey(bucket), 1);
    if (failures >= threshold) {
      await redis.set(openedKey(bucket), String(Date.now()));
      await redis.expire(openedKey(bucket), openSec * 2);
      await redis.expire(failKey(bucket), openSec * 2);
    }
  } catch (err) {
    console.warn('[cm/circuitBreaker] recordFailure failed:', bucket, err);
  }
}

export async function recordSuccess(bucket: string): Promise<void> {
  try {
    await redis.del(failKey(bucket));
    await redis.del(openedKey(bucket));
  } catch (err) {
    console.warn('[cm/circuitBreaker] recordSuccess failed:', bucket, err);
  }
}
