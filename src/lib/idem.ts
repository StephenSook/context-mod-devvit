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
import { log } from './log';

const PROC_TTL_SEC = 86_400; // 24 hours
const PENDING_TTL_SEC = 5 * 60; // 5 min — caps lost-on-crash retry delay
const DONE_TTL_SEC = 7 * 86_400; // 7 days — long enough to survive retries
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
    log.error('cm/idem/firstSeen', 'redis err — fail-closed (skip)', { thingId, err });
    return false;
  }
}

/**
 * Reserve an action slot BEFORE executing the side-effect.
 * Returns `{token}` if not previously done AND not currently pending → proceed.
 * Returns null on conflict / already done / Redis error (fail-CLOSED).
 *
 * Caller MUST follow up with commitAction(actionId, token) on success OR
 * releaseAction(actionId, token) on failure. The token is mandatory:
 * commitAction/releaseAction compare-and-delete only if the pending value
 * still matches THIS caller's token, so a slow worker can't accidentally
 * delete a successor's valid lease (Codex CRITICAL 2026-05-16 fix).
 *
 * TOCTOU note: Devvit's Redis surface lacks Lua / transactions, so the
 * reservation pattern is lock-then-check (not check-then-lock). Set the
 * pending NX lock FIRST (atomic), then re-read done inside the lock window.
 * If done is set after we acquired the lock, release + skip — a concurrent
 * caller completed during the lock attempt. The lock guarantees only one
 * caller proceeds into the side-effect for a given actionId at a time.
 */
export async function reserveAction(
  actionId: string,
  sub?: string
): Promise<{ token: string } | null> {
  const doneKey = K.actionDone(actionId, sub);
  const pendingKey = K.actionPending(actionId, sub);
  // X31: crypto.randomUUID() is cryptographically random (Web Crypto API,
  // Devvit V8 runtime). Math.random was predictable enough that an attacker
  // with Redis read could craft a matching token + delete a successor's
  // lease. randomUUID closes that vector. Date.now() prefix kept so logs
  // are time-orderable for debugging.
  const token = `${Date.now()}-${crypto.randomUUID()}`;
  // W3: NX-set retries for LOCK_FAIL only. firstSeen has already gated this
  // trigger at the proc-key level (24h TTL); without a retry on transient
  // Redis blip the action is permanently dropped — next trigger sees
  // firstSeen=false and skips. Retry of NX is idempotent: either we got the
  // pending slot first (succeeds), or someone else did (returns non-OK).
  //
  // AE Polish #85 (gemini brutal-audit): aligned with commitAction's
  // `MAX_ATTEMPTS = backoffsMs.length + 1` style so both retry loops use
  // the same idiom. Semantically equivalent to the prior `attempt <=
  // lockBackoffsMs.length` form (both produce 3 attempts + 2 sleeps for
  // backoffsMs=[100, 300]) — the change is for maintenance clarity, not
  // behavior. Future-proof: if either array grows, both loops expand
  // identically.
  const lockBackoffsMs = [100, 300];
  const LOCK_MAX_ATTEMPTS = lockBackoffsMs.length + 1; // 3 attempts total
  let lockErr: unknown = null;
  for (let attempt = 0; attempt < LOCK_MAX_ATTEMPTS; attempt++) {
    try {
      const reserved = await redis.set(pendingKey, token, {
        nx: true,
        expiration: new Date(Date.now() + PENDING_TTL_SEC * 1000),
      });
      if (reserved !== 'OK') return null;
      lockErr = null;
      break;
    } catch (err) {
      lockErr = err;
      if (attempt < lockBackoffsMs.length) {
        await new Promise((r) => setTimeout(r, lockBackoffsMs[attempt]!));
      }
    }
  }
  if (lockErr) {
    log.error(
      'cm/idem/reserveAction',
      'LOCK_FAIL fail-closed after retries (action dropped)',
      { actionId, err: lockErr }
    );
    return null;
  }
  try {
    const done = await redis.get(doneKey);
    if (done) {
      // Token check is owner-safe — only delete pending if it's still ours.
      const current = await redis.get(pendingKey);
      if (current === token) await redis.del(pendingKey);
      return null;
    }
    return { token };
  } catch (err) {
    // ORPHANED_LEASE: pending-NX written but done-check threw. Lease will
    // TTL-expire in PENDING_TTL_SEC (5min); caller skips this attempt.
    log.error(
      'cm/idem/reserveAction',
      'ORPHANED_LEASE fail-closed (skip, TTL reaps in 5min)',
      { actionId, err }
    );
    return null;
  }
}

/**
 * Commit a successful action: write the 7d done marker, then clear the pending lease.
 *
 * Codex CRITICAL 2026-05-16 (a): if the done-marker write fails AND we delete the
 * pending lease, the next retry sees neither marker and fires the action AGAIN
 * (double mod-action: ban twice, comment twice, etc). Fix: retry done-write
 * with backoff, throw on persistent failure, NEVER delete the pending lease
 * unless the done marker was actually written. Pending TTL (5 min) caps the
 * worst-case wait — better double-action 5 min later than instantly.
 *
 * Codex CRITICAL 2026-05-16 (b): token compare-and-delete. If this worker's
 * pending lease TTL'd out and a successor acquired the same key with a new
 * token, blindly deleting pending would reopen the gate for a third execution.
 * The token check makes pending delete a no-op if we're no longer the owner.
 */
export async function commitAction(actionId: string, token: string, sub?: string): Promise<void> {
  const doneKey = K.actionDone(actionId, sub);
  const pendingKey = K.actionPending(actionId, sub);
  const doneExpiration = new Date(Date.now() + DONE_TTL_SEC * 1000);

  // AE Polish #54: was `[100, 300, 1000]` but the loop only consumes
  // backoffsMs[attempt] when `attempt < backoffsMs.length - 1` (i.e. for
  // attempts 0 and 1). So the 1000ms entry was dead code — never reached
  // because attempt=2 is the last iteration + skips the wait, then exits.
  // 3 attempts + 2 backoffs is correct; the array length should match the
  // wait count, not the attempt count. Cleanup makes future maintainers
  // less likely to be confused by the apparent off-by-one.
  const backoffsMs = [100, 300];
  const MAX_ATTEMPTS = backoffsMs.length + 1; // 3 attempts total
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      await redis.set(doneKey, '1', { expiration: doneExpiration });
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      if (attempt < backoffsMs.length) {
        await new Promise((resolve) => setTimeout(resolve, backoffsMs[attempt]!));
      }
    }
  }

  if (lastErr) {
    log.error(
      'cm/idem/commitAction',
      'DONE_WRITE_FAIL — side-effect already happened, idempotency marker NOT written after 3 retries. Pending lease intentionally NOT released to prevent immediate double-action; pending TTL will expire in 5 min then retry path can re-execute',
      { actionId, err: lastErr }
    );
    throw lastErr;
  }

  // Done marker is durable. Compare-and-delete pending — only clear it if we're
  // still the lease owner. If TTL expired + successor took over, current !=
  // token and we leave the successor's lease intact (it'll see done==true
  // when it re-reads in reserveAction's lock-then-check).
  try {
    const current = await redis.get(pendingKey);
    if (current === token) await redis.del(pendingKey);
  } catch (err) {
    log.error(
      'cm/idem/commitAction',
      'PENDING_DEL_FAIL (harmless, TTL reaps in 5min)',
      { actionId, err }
    );
  }
}

/**
 * Release a reserved action slot when the side-effect failed.
 * Compare-and-delete: only release if we still own the lease (token matches).
 * If a successor took over (our TTL expired), leave their lease intact.
 *
 * Codex CRITICAL 2026-05-16 fix: token check prevents the
 * "slow-worker-releases-successor's-lease" race that would otherwise allow
 * a third execution of the same actionId.
 */
export async function releaseAction(actionId: string, token: string, sub?: string): Promise<void> {
  const pendingKey = K.actionPending(actionId, sub);
  try {
    const current = await redis.get(pendingKey);
    if (current === token) await redis.del(pendingKey);
  } catch (err) {
    log.error(
      'cm/idem/releaseAction',
      'redis err (pending will expire in 5 min)',
      { actionId, err }
    );
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
export async function acquireLock(
  taskName: string,
  sub?: string
): Promise<(() => Promise<void>) | null> {
  const key = K.lock(taskName, sub);
  // X31: crypto.randomUUID() is cryptographically random (Web Crypto API,
  // Devvit V8 runtime). Math.random was predictable enough that an attacker
  // with Redis read could craft a matching token + delete a successor's
  // lease. randomUUID closes that vector. Date.now() prefix kept so logs
  // are time-orderable for debugging.
  const token = `${Date.now()}-${crypto.randomUUID()}`;
  try {
    const result = await redis.set(key, token, {
      nx: true,
      expiration: new Date(Date.now() + LOCK_TTL_SEC * 1000),
    });
    if (result !== 'OK') return null;
  } catch (err) {
    log.error('cm/idem/acquireLock', 'redis err — fail-closed (skip)', {
      taskName,
      err,
    });
    return null;
  }
  return async () => {
    try {
      const current = await redis.get(key);
      if (current === token) await redis.del(key);
    } catch (err) {
      log.error('cm/idem/acquireLock', 'releaseLock err (lock TTL will reap)', {
        taskName,
        err,
      });
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
