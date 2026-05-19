/**
 * Y1-X7: stats aggregation for the dashboard stat cards.
 *
 * Reads from events:recent50 (the 50-deep ring buffer recordEvent writes to)
 * and computes counters in-memory. The hourly cron writes a snapshot to
 * `cm:stats:snapshot:{sub}` so /api/stats reads a cheap key instead of
 * recomputing on every dashboard poll. /api/stats falls back to compute-
 * on-fly when the snapshot is absent (first install, post-clear).
 */

import { redis } from '@devvit/web/server';
import { readRecent } from './recentEvents';

export interface StatsRollup {
  /** Total events recorded in the 50-deep ring buffer. */
  total: number;
  /** Events w/ ts > now - 3600. */
  lastHour: number;
  /** Events w/ ts > now - 86400. */
  today: number;
  /** Sum of failed actions across all events. */
  failedActions: number;
  /** Top 5 rule keys by fire count. */
  topRules: { ruleKey: string; count: number }[];
  /** Snapshot computation timestamp. */
  computedAt: number;
  // AE Polish #38 — client-shape fields the dashboard StatsRow renders.
  // Previously the server returned only {total/lastHour/today/...} but the
  // client typed StatsRollup as {actionsToday/timeSavedMin/activeRules/
  // topRule/hourlyActions24h} + checked `hourlyActions24h` to detect empty.
  // Result: every production /api/stats response was treated as empty,
  // dashboard fell back to ZERO_STATS, real stat cards never showed real
  // data. Adding the client-shape fields server-side closes that gap.
  /** Same as `today` — aliased for client-shape compat. */
  actionsToday: number;
  /** Heuristic estimate: 4 minutes saved per moderation action today. */
  timeSavedMin: number;
  /** Distinct rule keys seen in the event ring (proxy for active rules). */
  activeRules: number;
  /** Top rule by fire count, "—" when empty. */
  topRule: string;
  /** 24-bucket hourly histogram (oldest first, newest last). */
  hourlyActions24h: number[];
}

function snapshotKey(sub: string): string {
  return `cm:stats:snapshot:${sub}`;
}

/**
 * Compute fresh stats from the events:recent50 ZSET. Called by the cron
 * (writes snapshot) and by /api/stats as the fall-through path.
 */
export async function computeStats(sub: string): Promise<StatsRollup> {
  const events = await readRecent(sub);
  const now = Date.now();
  const oneHourAgo = now - 3_600_000;
  const oneDayAgo = now - 86_400_000;

  let lastHour = 0;
  let today = 0;
  let failedActions = 0;
  const ruleCounts = new Map<string, number>();

  for (const e of events) {
    if (e.ts > oneHourAgo) lastHour++;
    if (e.ts > oneDayAgo) today++;
    for (const a of e.actions) {
      if (!a.ok) failedActions++;
    }
    if (e.runName && e.checkName) {
      const key = `${e.runName} / ${e.checkName}`;
      ruleCounts.set(key, (ruleCounts.get(key) ?? 0) + 1);
    }
  }

  const topRules = Array.from(ruleCounts.entries())
    .map(([ruleKey, count]) => ({ ruleKey, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // AE Polish #38: build the 24-hour bucket histogram. Each bucket is one
  // wall-clock hour. Index 0 = (now - 24h, now - 23h); index 23 = (now - 1h, now).
  // Events outside the 24h window contribute nothing.
  const hourlyActions24h = new Array<number>(24).fill(0);
  const dayStart = now - 24 * 3_600_000;
  for (const e of events) {
    if (e.ts <= dayStart || e.ts > now) continue;
    const bucket = Math.min(23, Math.floor((e.ts - dayStart) / 3_600_000));
    hourlyActions24h[bucket]! += 1;
  }

  return {
    total: events.length,
    lastHour,
    today,
    failedActions,
    topRules,
    computedAt: now,
    // Client-shape fields (Polish #38) — derived from the same event ring.
    actionsToday: today,
    timeSavedMin: today * 4, // heuristic: 4 min saved per mod action
    activeRules: ruleCounts.size,
    topRule: topRules[0]?.ruleKey ?? '—',
    hourlyActions24h,
  };
}

// Hourly-cron writes; /api/stats reads — single key vs per-poll aggregation.
// Returns { stats, persisted } so the cron can log status:'ignored' if the
// write failed (silent-failure-hunter Wave-AB-review BLOCKER #1).
export interface WriteSnapshotResult {
  stats: StatsRollup;
  persisted: boolean;
  error?: string;
}

export async function writeStatsSnapshot(sub: string): Promise<WriteSnapshotResult> {
  const stats = await computeStats(sub);
  try {
    await redis.set(snapshotKey(sub), JSON.stringify(stats));
    return { stats, persisted: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cm/statsRollup] snapshot write failed:', sub, err);
    return { stats, persisted: false, error: msg };
  }
}

/**
 * Read the snapshot if fresh enough; otherwise compute on-the-fly. Used by
 * /api/stats. Treats snapshots older than 1h as stale.
 *
 * AE Polish #6 (Agent B #6): a corrupt snapshot (invalid JSON, missing
 * computedAt, etc.) used to fall through to compute silently — but the
 * same corrupt key kept getting re-parsed every dashboard poll (~30s)
 * until the next hourly cron overwrote it. Now we DEL the bad key on
 * parse failure so the next read goes straight to compute without the
 * wasted GET + parse round-trip.
 */
export async function readStatsSnapshot(sub: string): Promise<StatsRollup> {
  const key = snapshotKey(sub);
  try {
    const raw = await redis.get(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as StatsRollup;
        if (parsed.computedAt > Date.now() - 3_600_000) {
          return parsed;
        }
      } catch (parseErr) {
        // AE Polish #6: nuke the corrupt key so subsequent reads don't
        // re-pay the GET + JSON.parse(invalid) overhead until the next
        // hourly cron. Best-effort — if del fails too the next cycle
        // gets another chance.
        console.warn('[cm/statsRollup] corrupt snapshot — deleting key:', key, parseErr);
        try {
          await redis.del(key);
        } catch (delErr) {
          console.warn('[cm/statsRollup] failed to delete corrupt key:', key, delErr);
        }
      }
    }
  } catch (err) {
    console.warn('[cm/statsRollup] snapshot read failed (falling through to compute):', sub, err);
  }
  return computeStats(sub);
}
