/**
 * Recent events ZSET (Step 3.5, brought forward to Phase 2 so Step 2.3
 * `handleActivity` has a working sink).
 *
 * Council fixes baked in:
 *   1. Software Lead — same-ms collision: sorted-set members are unique strings
 *      so two same-ms events with identical {activityId, runName} would dedup.
 *      Add a `nonce` (crypto.randomUUID()).
 *   2. Long-Term Architect — versioning: stamp `v: 1`. Without it, when the
 *      RecentEvent shape mutates in 3 months every install's old events become
 *      unparseable garbage.
 *   3. Long-Term Architect — naming: key is `events:recent50` (see keys.ts)
 *      so a future "last 500" ZSET can land beside it without renaming.
 *
 * Phase 3.5 will add `readRecent` + `/api/recent` wiring. For Phase 2 we only
 * need the writer side so the orchestrator pipeline is end-to-end live.
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
  /**
   * Codex session-review HIGH 2026-05-16: extended actions[] to carry full
   * ActionResult shape (`status` + optional `wouldHaveCalled`) so the
   * dashboard can distinguish dry-run vs error vs skipped-locked vs ok.
   * Keep `ok: boolean` for back-compat with existing client renderers;
   * client can opt into status-aware rendering when ready.
   */
  actions: {
    kind: string;
    ok: boolean;
    status?: 'ok' | 'skipped-locked' | 'dry-run' | 'error';
    wouldHaveCalled?: string;
  }[];
}

export async function recordEvent(
  event: Omit<RecentEvent, 'v' | 'nonce'>,
  sub?: string,
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
    await redis.zRemRangeByRank(K.eventsRecent(sub), 0, -51);  // keep last 50
  } catch (err) {
    // Event-log write is best-effort — losing one row should never abort the
    // already-completed Reddit action. Log and move on.
    console.error('[cm/recentEvents] zAdd failed (event dropped):', event, err);
  }
}

/**
 * Read the most-recent 50 events, newest first. Step 3.5 reader side; called
 * from /api/recent (src/routes/api.ts).
 *
 * Best-effort: a redis hiccup returns `[]` rather than 500. The dashboard
 * separately surfaces a `last-refreshed-at` indicator so an empty list +
 * stale timestamp tells the user the server is having trouble without
 * making the whole page error out.
 *
 * Parse failures (corrupt member) are dropped silently — the migrate()
 * pass is the version gate; anything that throws there is logged + dropped
 * rather than poisoning the whole batch.
 */
export async function readRecent(sub?: string): Promise<RecentEvent[]> {
  let raw;
  try {
    raw = await redis.zRange(K.eventsRecent(sub), 0, 49, { by: 'rank', reverse: true });
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
 */
function migrate(raw: unknown): RecentEvent | null {
  if (raw == null || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  switch (obj.v) {
    case 1:
      return obj as unknown as RecentEvent;
    case undefined:
      // Pre-v1 event written before schema versioning existed — stamp v:1 + nonce.
      return {
        ...(obj as Omit<RecentEvent, 'v' | 'nonce'>),
        v: 1,
        nonce: typeof obj.nonce === 'string' ? obj.nonce : crypto.randomUUID(),
      };
    default:
      throw new Error(`migrate(): unknown RecentEvent version ${String(obj.v)}`);
  }
}
