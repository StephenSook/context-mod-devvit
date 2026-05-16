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
  actions: { kind: string; ok: boolean }[];
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
