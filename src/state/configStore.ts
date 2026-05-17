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
 * Codex H2 2026-05-16: previous read-modify-write of cfgCurrentRev raced
 * concurrent publishers (two cron-tick + manual-reload calls could both read
 * N, both write rev:N+1 with different payloads, last pointer wins). Fix:
 * atomic INCR on a dedicated rev-counter key. INCR returns the post-increment
 * value, so two concurrent callers get DISTINCT rev numbers (N and N+1)
 * regardless of interleaving. Pointer flip still happens last so readers
 * always see a fully-durable rev payload before the pointer points at it.
 *
 * NOTE: the rev-counter starts at 0 on the very first INCR (returns 1), so
 * first-published rev is now 1, not 0. We subtract 1 to keep the rev-0
 * historical contract — the counter stores last-allocated-rev + 1.
 */
export async function publish(config: AppConfig, sub?: string): Promise<number> {
  const counterKey = K.cfgRevCounter(sub);
  // INCR returns the post-increment value; subtract 1 so first publish = rev 0.
  const allocated = await redis.incrBy(counterKey, 1);
  const next = allocated - 1;
  await redis.set(K.cfgRev(next, sub), JSON.stringify(config));
  await redis.set(K.cfgCurrentRev(sub), String(next));
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
    // Wave U WARN fix (Codex CR4): on missing payload mid-window, CONTINUE
    // (rev might have been GC'd or never published) instead of breaking. Old
    // behavior dropped revs 4-0 if rev 5 was missing. continue walks past
    // the gap to surface available history.
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
