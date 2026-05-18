/**
 * Atomic config publish (D5).
 *
 * Write the new immutable `cfg:rev:{n}` payload FIRST, then bump the
 * `cfg:current_rev` pointer atomically. `handleActivity` reads the pointer
 * ONCE at event start and threads `n` through the whole pipeline so a
 * publish mid-event can't half-apply.
 *
 * Devvit Redis has no Lua / multi-key transactions usable from here, but the
 * two-write pattern is safe: a reader sees either the OLD pointer (→ OLD rev)
 * or the NEW pointer pointing at the NEW rev (we already wrote it). The
 * pointer is the synchronization point.
 *
 * Multi-tenant: every key threads `sub` via `K.*` (Step 1.1) — default sentinel
 * `_` for callsites without a subreddit context (D0.1 skeleton, fresh install).
 */

import { redis } from '@devvit/web/server';
import { K } from './keys';
import type { AppConfig } from '../shared/types';

export interface ConfigSnapshot {
  rev: number;
  config: AppConfig;
}

/**
 * Publish a new config. Returns the new revision number.
 *
 * Atomic INCR allocates a distinct rev per concurrent publisher (closes the
 * read-modify-write race where two callers could both pick N+1 with different
 * payloads). First INCR returns 1; subtract 1 so first-published rev is 0.
 *
 * W4: monotonic pointer guard. After INCR allocates next=N, read the current
 * pointer and only advance if N > current. Without this, a slow writer
 * holding rev=N could overwrite a faster writer's rev=N+1 pointer, rolling
 * config backwards. Devvit Redis lacks CAS/Lua, so this is read-then-write
 * (small TOCTOU window remains: a writer that succeeds between our read and
 * our set still loses). Acceptable for hackathon scope — collision requires
 * publishers in the same millisecond, which only happens if a manual reload
 * lands on the cron tick.
 *
 * AE CRITICAL #6: wrap the whole INCR/SET/GET/SET sequence so a Redis blip
 * mid-publish surfaces a typed PublishError to the caller (scheduler cron,
 * triggers default-seed, menu reload-config) instead of leaking a half-state
 * (rev counter incremented but payload never written → getCurrentRev throws
 * "cfg payload missing" forever). Callers can catch + show "publish failed,
 * retry" to the mod instead of a 500.
 */
export class PublishError extends Error {
  constructor(
    message: string,
    public phase: 'allocate-rev' | 'write-payload' | 'read-pointer' | 'advance-pointer',
    public override cause: unknown
  ) {
    super(message);
    this.name = 'PublishError';
  }
}

export async function publish(config: AppConfig, sub?: string): Promise<number> {
  const counterKey = K.cfgRevCounter(sub);
  let allocated: number;
  try {
    allocated = await redis.incrBy(counterKey, 1);
  } catch (err) {
    throw new PublishError(
      `rev counter INCR failed (no rev allocated, safe to retry): ${msg(err)}`,
      'allocate-rev',
      err
    );
  }
  const next = allocated - 1;
  try {
    await redis.set(K.cfgRev(next, sub), JSON.stringify(config));
  } catch (err) {
    throw new PublishError(
      `rev=${next} payload write failed (rev counter bumped but payload missing — pointer NOT advanced, retry will allocate next rev): ${msg(err)}`,
      'write-payload',
      err
    );
  }
  let currentStr: string | null | undefined;
  try {
    currentStr = await redis.get(K.cfgCurrentRev(sub));
  } catch (err) {
    throw new PublishError(
      `rev=${next} payload written but pointer read failed (pointer NOT advanced, retry will allocate next rev): ${msg(err)}`,
      'read-pointer',
      err
    );
  }
  const current = currentStr ? Number.parseInt(currentStr, 10) : -1;
  if (!Number.isFinite(current) || next > current) {
    try {
      await redis.set(K.cfgCurrentRev(sub), String(next));
    } catch (err) {
      throw new PublishError(
        `rev=${next} payload written but pointer advance failed (config is published but readers still see old rev — retry will re-publish): ${msg(err)}`,
        'advance-pointer',
        err
      );
    }
  }
  return next;
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Read the current published config. Returns null only when nothing has
 * been published yet (fresh install — pointer doesn't exist).
 *
 * X3: distinguishes "no config" (null pointer = legitimate fresh install)
 * from "corrupt config" (THROWS) so the caller can surface infrastructure
 * failures to the dashboard instead of silently treating both as no-op.
 * Previously, a corrupt rev payload returned null + handleActivity treated
 * it as "no config yet" → all moderation silently stopped.
 */
export async function getCurrentRev(sub?: string): Promise<ConfigSnapshot | null> {
  const ptr = await redis.get(K.cfgCurrentRev(sub));
  if (ptr == null) return null;
  const rev = Number.parseInt(ptr, 10);
  if (!Number.isFinite(rev)) {
    throw new Error(`corrupt cfg pointer at ${K.cfgCurrentRev(sub)}: "${ptr}"`);
  }
  const payload = await redis.get(K.cfgRev(rev, sub));
  if (payload == null) {
    throw new Error(`cfg pointer rev=${rev} but payload missing at ${K.cfgRev(rev, sub)}`);
  }
  try {
    const config = JSON.parse(payload) as AppConfig;
    return { rev, config };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`cfg payload parse failed at rev ${rev}: ${msg}`);
  }
}

/**
 * Wave S Phase S9 — Read the last N config revisions for the diff viewer.
 * Iterates rev pointer backwards from current. Stops at first missing payload
 * (revs can be GC'd outside the window) or when N is reached.
 */
export async function getRecentRevs(
  sub: string | undefined,
  limit = 10
): Promise<ConfigSnapshot[]> {
  const ptr = await redis.get(K.cfgCurrentRev(sub));
  if (ptr == null) return [];
  const currentRev = Number.parseInt(ptr, 10);
  if (!Number.isFinite(currentRev)) return [];
  const out: ConfigSnapshot[] = [];
  for (let i = 0; i < limit; i++) {
    const rev = currentRev - i;
    if (rev < 0) break;
    const payload = await redis.get(K.cfgRev(rev, sub));
    // On missing payload mid-window, CONTINUE (rev might have been GC'd or
    // never published) instead of breaking — otherwise a gap at rev N would
    // hide every rev older than N from the history viewer.
    if (payload == null) continue;
    try {
      const config = JSON.parse(payload) as AppConfig;
      out.push({ rev, config });
    } catch (err) {
      console.warn('[cm/configStore] corrupt cfg payload at rev', rev, err);
    }
  }
  return out;
}
