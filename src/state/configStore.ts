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
 */
export async function publish(config: AppConfig, sub?: string): Promise<number> {
  const counterKey = K.cfgRevCounter(sub);
  const allocated = await redis.incrBy(counterKey, 1);
  const next = allocated - 1;
  await redis.set(K.cfgRev(next, sub), JSON.stringify(config));
  const currentStr = await redis.get(K.cfgCurrentRev(sub));
  const current = currentStr ? Number.parseInt(currentStr, 10) : -1;
  if (!Number.isFinite(current) || next > current) {
    await redis.set(K.cfgCurrentRev(sub), String(next));
  }
  return next;
}

/**
 * Read the current published config. Returns null when nothing has been
 * published yet (fresh install pre-Step-3.1).
 */
export async function getCurrentRev(sub?: string): Promise<ConfigSnapshot | null> {
  const ptr = await redis.get(K.cfgCurrentRev(sub));
  if (ptr == null) return null;
  const rev = Number.parseInt(ptr, 10);
  if (!Number.isFinite(rev)) return null;
  const payload = await redis.get(K.cfgRev(rev, sub));
  if (payload == null) return null;
  try {
    const config = JSON.parse(payload) as AppConfig;
    return { rev, config };
  } catch (err) {
    console.error('[cm/configStore] failed to parse cfg payload at rev', rev, err);
    return null;
  }
}

/**
 * Wave S Phase S9 — Read the last N config revisions for the diff viewer.
 * Iterates rev pointer backwards from current. Stops at first missing payload
 * (revs can be GC'd outside the window) or when N is reached.
 */
export async function getRecentRevs(sub: string | undefined, limit = 10): Promise<ConfigSnapshot[]> {
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
