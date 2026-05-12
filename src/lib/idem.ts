/**
 * Idempotency + cron single-flight helpers for ContextMod on Devvit.
 *
 * Two distinct idempotency gates (per ultraplan H2 + Codex HIGH#1):
 *   1. Trigger-side: cm:proc:{thingId} — dedupes at-least-once trigger delivery.
 *      24h TTL is long enough to catch retries, short enough to bound Redis growth.
 *   2. Action-side: cm:action:{hash} — dedupes individual side-effects within
 *      a single trigger execution. Written BEFORE the side-effect so a crash
 *      mid-action doesn't cause re-execution on retry.
 *
 * Cron single-flight (per ultraplan M1): cm:lock:{task} — prevents overlapping
 * invocations of the same scheduled job. Short TTL (60s) so a crashed handler
 * doesn't deadlock the schedule.
 */

import { redis } from '@devvit/web/server';

const PROC_TTL_SEC = 86_400; // 24 hours
const ACTION_TTL_SEC = 7 * 86_400; // 7 days — long enough to survive retries
const LOCK_TTL_SEC = 60;

/**
 * Trigger-side idempotency gate. Call at the top of every trigger handler.
 * Returns true the FIRST time a thingId is seen, false on subsequent retries.
 */
export async function firstSeen(thingId: string): Promise<boolean> {
  const key = `cm:proc:${thingId}`;
  const result = await redis.set(key, '1', { nx: true, expiration: new Date(Date.now() + PROC_TTL_SEC * 1000) });
  return result === 'OK';
}

/**
 * Action-side idempotency gate. Call BEFORE executing a side-effect.
 * Returns true if the action has NOT yet been performed (proceed),
 * false if it HAS been performed (skip — replay scenario).
 *
 * actionId should be deterministic: SHA(thingId + actionType + payloadHash).
 */
export async function reserveAction(actionId: string): Promise<boolean> {
  const key = `cm:action:${actionId}`;
  const result = await redis.set(key, '1', { nx: true, expiration: new Date(Date.now() + ACTION_TTL_SEC * 1000) });
  return result === 'OK';
}

/**
 * Release a reserved action slot if the side-effect failed.
 * Allows retry on the next trigger delivery.
 */
export async function releaseAction(actionId: string): Promise<void> {
  await redis.del(`cm:action:${actionId}`);
}

/**
 * Compute a deterministic action ID. Uses a simple FNV-1a 64-bit hash
 * (pure JS, no native deps) over the input string.
 */
export function actionId(thingId: string, actionType: string, payload: string): string {
  const input = `${thingId}|${actionType}|${payload}`;
  return `${fnv1a64(input)}`;
}

/**
 * Cron single-flight lock. Returns a release function on success, null
 * if the lock is already held.
 *
 * Usage:
 *   const release = await acquireLock('refresh-config');
 *   if (!release) return c.json({ skipped: 'locked' });
 *   try { ...work... } finally { await release(); }
 */
export async function acquireLock(taskName: string): Promise<(() => Promise<void>) | null> {
  const key = `cm:lock:${taskName}`;
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await redis.set(key, token, { nx: true, expiration: new Date(Date.now() + LOCK_TTL_SEC * 1000) });
  if (result !== 'OK') return null;
  return async () => {
    // Only release if we still hold the lock (avoid releasing a re-acquired lock)
    const current = await redis.get(key);
    if (current === token) await redis.del(key);
  };
}

/**
 * Pure-JS FNV-1a 64-bit hash. Deterministic, fast, no deps.
 * Returns hex string.
 */
function fnv1a64(input: string): string {
  let hashLo = 0x84222325;
  let hashHi = 0xcbf29ce4;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    hashLo ^= c;
    // 64-bit multiply by FNV prime (0x100000001b3) using 32-bit math
    const lo = (hashLo & 0xffff) * 0x1b3;
    const mid = ((hashLo >>> 16) * 0x1b3 + (hashHi & 0xffff) * 0x100 + (lo >>> 16)) >>> 0;
    const hi = ((hashHi >>> 16) * 0x100 + (mid >>> 16)) >>> 0;
    hashLo = ((mid & 0xffff) << 16) | (lo & 0xffff);
    hashHi = hi & 0xffffffff;
    hashLo = hashLo >>> 0;
    hashHi = hashHi >>> 0;
  }
  return (hashHi.toString(16).padStart(8, '0') + hashLo.toString(16).padStart(8, '0'));
}
