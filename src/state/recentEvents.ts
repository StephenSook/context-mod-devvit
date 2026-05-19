/**
 * Recent events ZSET — bounded ring (50 most recent), feeds the dashboard
 * `/api/recent` endpoint.
 *
 * Three invariants baked into the storage shape:
 *   1. `nonce` (crypto.randomUUID()) appended so two same-ms events with
 *      identical {activityId, runName} don't dedup into one ZSET member.
 *   2. `v: 1` schema stamp — when RecentEvent shape mutates later, the
 *      migrate() pass can fork on this version field instead of every
 *      install's old events becoming unparseable garbage.
 *   3. Key name `events:recent50` keeps room for a future "last 500" ZSET
 *      to land beside it without renaming the active one.
 */

import { redis } from '@devvit/web/server';
import { K } from './keys';

export interface RecentEvent {
  v: 1;
  nonce: string;
  ts: number;
  activityId: string;
  runName: string;
  checkName: string;
  triggered: boolean;
  // Mirrors ActionResult; status + wouldHaveCalled added so the dashboard
  // can distinguish dry-run vs error vs skipped-locked vs ok. `ok` is kept
  // for back-compat with the original boolean-only client renderer.
  actions: {
    kind: string;
    ok: boolean;
    status?: 'ok' | 'skipped-locked' | 'dry-run' | 'error';
    wouldHaveCalled?: string;
  }[];
}

export async function recordEvent(
  event: Omit<RecentEvent, 'v' | 'nonce'>,
  sub?: string
): Promise<void> {
  const versioned: RecentEvent = {
    v: 1,
    nonce: crypto.randomUUID(),
    ...event,
  };
  try {
    await redis.zAdd(K.eventsRecent(sub), {
      score: event.ts,
      member: JSON.stringify(versioned),
    });
    await redis.zRemRangeByRank(K.eventsRecent(sub), 0, -51); // keep last 50
  } catch (err) {
    // Event-log write is best-effort — losing one row should never abort the
    // already-completed Reddit action. Log and move on.
    console.error('[cm/recentEvents] zAdd failed (event dropped):', event, err);
  }
}

/**
 * Read the most-recent 50 events, newest first.
 *
 * Best-effort: a redis hiccup returns `[]` rather than 500. The dashboard
 * separately surfaces a `last-refreshed-at` indicator so an empty list +
 * stale timestamp tells the user the server is having trouble without
 * making the whole page error out.
 *
 * Parse failures (corrupt member) are dropped silently — migrate() is the
 * version gate; anything that throws there is logged + dropped rather than
 * poisoning the whole batch.
 */
export async function readRecent(sub?: string): Promise<RecentEvent[]> {
  let raw;
  try {
    raw = await redis.zRange(K.eventsRecent(sub), 0, 49, {
      by: 'rank',
      reverse: true,
    });
  } catch (err) {
    console.error('[cm/recentEvents] zRange failed:', err);
    return [];
  }
  const out: RecentEvent[] = [];
  for (const entry of raw) {
    try {
      const parsed = JSON.parse(entry.member) as unknown;
      const migrated = migrate(parsed);
      if (migrated) out.push(migrated);
    } catch (err) {
      console.error('[cm/recentEvents] member parse/migrate failed (dropped):', entry.member, err);
    }
  }
  return out;
}

/**
 * Version gate (Long-Term Architect, Step 3.5). Switch on `v` so a future
 * RecentEvent shape change doesn't orphan historical events. v1 is identity
 * today; the seam exists to claim the spot — and to make an unexpected `v`
 * loud (throw → caller logs + drops the row) rather than silently spreading
 * the wrong shape downstream.
 *
 * AE Polish #5: previously `case 1` returned `obj as unknown as RecentEvent`
 * w/ no field validation. A poisoned member like `{v:1, actions:"not-array"}`
 * propagated to statsRollup.ts:51 `for (const a of e.actions)` which throws
 * on iteration of a non-iterable + brings down /api/stats. Now each field
 * is type-checked before the cast; bad members get dropped + logged like
 * any other parse failure (parsed.member is logged at the caller in
 * readRecent's catch).
 */
function isValidRecentEventShape(obj: Record<string, unknown>): boolean {
  if (typeof obj.nonce !== 'string') return false;
  if (typeof obj.ts !== 'number') return false;
  if (typeof obj.activityId !== 'string') return false;
  if (typeof obj.runName !== 'string') return false;
  if (typeof obj.checkName !== 'string') return false;
  if (typeof obj.triggered !== 'boolean') return false;
  if (!Array.isArray(obj.actions)) return false;
  for (const a of obj.actions) {
    if (!a || typeof a !== 'object') return false;
    const ao = a as Record<string, unknown>;
    if (typeof ao.kind !== 'string') return false;
    if (typeof ao.ok !== 'boolean') return false;
  }
  return true;
}

/**
 * AE Polish #16 (Agent B #8): pre-v1 read-time backfill removed. v0.5.x
 * is well past skeleton — every install has been writing v:1-stamped
 * events since recordEvent() landed in Phase 2.3. The pre-v1 case was
 * minting a new crypto.randomUUID() nonce on every READ (no write-through)
 * which made dedup behave inconsistently if a pre-v1 row ever DID get
 * written back. Removing the branch eliminates that hazard + keeps the
 * single source of nonce truth at recordEvent write time.
 */
function migrate(raw: unknown): RecentEvent | null {
  if (raw == null || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  switch (obj.v) {
    case 1:
      if (!isValidRecentEventShape(obj)) {
        throw new Error(
          'migrate(): v1 event failed shape validation (poisoned member dropped)'
        );
      }
      return obj as unknown as RecentEvent;
    default:
      throw new Error(`migrate(): unsupported RecentEvent version ${String(obj.v)} (pre-v1 dropped 2026-05-18)`);
  }
}
