/**
 * Idempotency + cron single-flight helpers for ContextMod on Devvit.
 *
 * Three layered gates (post-Codex review fixes):
 *   1. Trigger-side firstSeen: cm:proc:{thingId} — 24h NX guard. Fail-CLOSED on
 *      Redis error (treats redis-down as "seen" to avoid double-processing).
 *   2. Action-side reserve/commit/release:
 *      - cm:action:pending:{hash} — 5min TTL, written BEFORE side-effect
 *      - cm:action:done:{hash}    — 7d TTL, written AFTER side-effect succeeds
 *      Crash mid-action: pending TTL expires in 5 min, retry succeeds.
 *      Success: pending deleted, done lasts 7d to lock out replays.
 *   3. Cron single-flight: cm:lock:{task} — 60s NX guard with token verification
 *      on release so a re-acquired lock isn't deleted by the previous holder.
 *
 * Hash: BigInt-correct FNV-1a 64. Test vectors verified in tests/lib/idem.test.ts.
 */

import { redis } from '@devvit/web/server';
import { K } from '../state/keys';

const PROC_TTL_SEC = 86_400;          // 24 hours
const PENDING_TTL_SEC = 5 * 60;        // 5 min — caps lost-on-crash retry delay
const DONE_TTL_SEC = 7 * 86_400;       // 7 days — long enough to survive retries
const LOCK_TTL_SEC = 60;

/**
 * Trigger-side idempotency gate. Call at the top of every trigger handler.
 * Returns true the FIRST time a thingId is seen, false on subsequent retries.
 * Fail-CLOSED on Redis error (returns false → handler skips work).
 *
 * `sub` is optional and defaults to the `'_'` sentinel — callers that have a
 * subreddit context (Step 2.4 onward) should thread it through for tenant
 * isolation. See src/state/keys.ts.
 */
export async function firstSeen(thingId: string, sub?: string): Promise<boolean> {
  const key = K.proc(thingId, sub);
  try {
    const result = await redis.set(key, '1', {
      nx: true,
      expiration: new Date(Date.now() + PROC_TTL_SEC * 1000),
    });
    return result === 'OK';
  } catch (err) {
    console.error('[cm/idem/firstSeen] redis err — fail-closed (skip):', thingId, err);
    return false;
  }
}

/**
 * Reserve an action slot BEFORE executing the side-effect.
 * Returns true if not previously done AND not currently pending → proceed.
 * Fail-CLOSED on Redis error (treats as already done → skip).
 *
 * Caller MUST follow up with commitAction() on success OR releaseAction() on failure.
 *
 * TOCTOU note: Devvit's Redis surface lacks Lua / transactions, so the
 * reservation pattern is lock-then-check (not check-then-lock). Set the
 * pending NX lock FIRST (atomic), then re-read done inside the lock window.
 * If done is set after we acquired the lock, release + skip — a concurrent
 * caller completed during the lock attempt. The lock guarantees only one
 * caller proceeds into the side-effect for a given actionId at a time.
 */
export async function reserveAction(actionId: string, sub?: string): Promise<boolean> {
  const doneKey = K.actionDone(actionId, sub);
  const pendingKey = K.actionPending(actionId, sub);
  let reservedHere = false;
  try {
    const reserved = await redis.set(pendingKey, '1', {
      nx: true,
      expiration: new Date(Date.now() + PENDING_TTL_SEC * 1000),
    });
    if (reserved !== 'OK') return false;
    reservedHere = true;
    const done = await redis.get(doneKey);
    if (done) {
      await redis.del(pendingKey);
      reservedHere = false;
      return false;
    }
    return true;
  } catch (err) {
    // Distinct error tag depending on which half of the lock-then-check failed.
    // ORPHANED_LEASE means we hold a pending-NX that we couldn't verify against
    // done — the lease will TTL-expire in PENDING_TTL_SEC (5min); caller skips.
    const tag = reservedHere
      ? '[cm/idem/reserveAction/ORPHANED_LEASE]'
      : '[cm/idem/reserveAction/LOCK_FAIL]';
    console.error(tag, 'fail-closed (skip):', actionId, err);
    return false;
  }
}

/**
 * Commit a successful action: write the 7d done marker and clear the pending lease.
 */
export async function commitAction(actionId: string, sub?: string): Promise<void> {
  try {
    await redis.set(K.actionDone(actionId, sub), '1', {
      expiration: new Date(Date.now() + DONE_TTL_SEC * 1000),
    });
    await redis.del(K.actionPending(actionId, sub));
  } catch (err) {
    console.error('[cm/idem/commitAction] redis err (action already succeeded):', actionId, err);
  }
}

/**
 * Release a reserved action slot when the side-effect failed.
 * Lets the next retry re-attempt the action.
 */
export async function releaseAction(actionId: string, sub?: string): Promise<void> {
  try {
    await redis.del(K.actionPending(actionId, sub));
  } catch (err) {
    console.error('[cm/idem/releaseAction] redis err (pending will expire in 5 min):', actionId, err);
  }
}

/**
 * Deterministic action ID for use with reserveAction. Combines thingId + kind + payload
 * digest via BigInt-correct FNV-1a 64.
 */
export function actionId(thingId: string, actionType: string, payload: string): string {
  return fnv1a64(`${thingId}|${actionType}|${payload}`);
}

/**
 * Cron single-flight lock. Returns a release function on success, null if held.
 * Release verifies our token still owns the lock; if TTL expired and someone else
 * grabbed it, we leave it alone. Defensive: release never throws.
 *
 * Usage:
 *   const release = await acquireLock('refresh-config');
 *   if (!release) return c.json({ skipped: 'locked' });
 *   try { ...work... } finally { await release(); }
 */
export async function acquireLock(taskName: string, sub?: string): Promise<(() => Promise<void>) | null> {
  const key = K.lock(taskName, sub);
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    const result = await redis.set(key, token, {
      nx: true,
      expiration: new Date(Date.now() + LOCK_TTL_SEC * 1000),
    });
    if (result !== 'OK') return null;
  } catch (err) {
    console.error('[cm/idem/acquireLock] redis err — fail-closed (skip):', taskName, err);
    return null;
  }
  return async () => {
    try {
      const current = await redis.get(key);
      if (current === token) await redis.del(key);
    } catch (err) {
      console.error('[cm/idem/releaseLock] err (lock TTL will reap):', taskName, err);
    }
  };
}

/**
 * FNV-1a 64-bit hash via BigInt. Pure JS, no native deps. CSP-safe.
 * Test vectors verified in tests/lib/idem.test.ts against the canonical FNV-1a 64 suite.
 */
const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK_64 = 0xffffffffffffffffn;

export function fnv1a64(input: string): string {
  let h = FNV_OFFSET;
  for (let i = 0; i < input.length; i++) {
    h ^= BigInt(input.charCodeAt(i));
    h = (h * FNV_PRIME) & MASK_64;
  }
  return h.toString(16).padStart(16, '0');
}
