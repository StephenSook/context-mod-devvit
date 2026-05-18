/**
 * Fixed-window Redis token bucket. Simple counter w/ TTL — accurate enough
 * for cost-control (OpenAI quota burn) and trivially Devvit-Redis-compatible
 * (INCR + EXPIRE only — no Lua, no transactions).
 *
 * Per-window semantics: first call in a fresh window sets the TTL; subsequent
 * calls increment without resetting the window. Resets when TTL expires.
 */

import { redis } from '@devvit/web/server';

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  max: number;
  resetInSec: number;
  /** X39: true when the bucket couldn't be read (Redis blip) — caller may
   *  decide to apply a soft cap or surface "degraded" to the user. */
  degraded?: boolean;
}

/**
 * Check + increment a rate-limit bucket.
 *
 * @param bucket — short identifier (e.g. "explain") combined with `sub` for the key
 * @param sub — subreddit name for tenant isolation
 * @param max — max calls allowed in the window
 * @param windowSec — window size (e.g. 3600 = 1 hour)
 *
 * Returns allowed=false when the increment would exceed `max`. Note: count
 * is incremented even on deny so that aggressive callers see a fast denial
 * + don't flood Redis with retries.
 */
export async function checkRateLimit(
  bucket: string,
  sub: string,
  max: number,
  windowSec: number
): Promise<RateLimitResult> {
  const key = `cm:rl:${bucket}:${sub}`;
  try {
    const count = await redis.incrBy(key, 1);
    if (count === 1) {
      await redis.expire(key, windowSec);
    }
    // resetInSec is the fixed window size — caller can use this to render
    // "try again in ~X minutes". TTL on the key in Redis is the actual
    // ground truth, but we don't pay the round-trip to read it.
    return {
      allowed: count <= max,
      count,
      max,
      resetInSec: windowSec,
    };
  } catch (err) {
    // Fail-OPEN on Redis blip — better to let a mod's legit click through
    // than block them. The OpenAI quota itself is the ultimate cap.
    // degraded:true lets the caller decide to apply a soft cap.
    console.error(
      '[cm/ratelimit] check failed (fail-open, degraded):',
      bucket,
      sub,
      err
    );
    return {
      allowed: true,
      count: 0,
      max,
      resetInSec: windowSec,
      degraded: true,
    };
  }
}
