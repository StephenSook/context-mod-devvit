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
 */
export async function publish(config: AppConfig, sub?: string): Promise<number> {
  const currentRaw = await redis.get(K.cfgCurrentRev(sub));
  const current = currentRaw == null ? -1 : Number.parseInt(currentRaw, 10);
  const next = (Number.isFinite(current) ? current : -1) + 1;
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
