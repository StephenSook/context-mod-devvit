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

  return {
    total: events.length,
    lastHour,
    today,
    failedActions,
    topRules,
    computedAt: now,
  };
}

/**
 * Write the freshly-computed snapshot to Redis. Called from the hourly cron
 * so /api/stats can read a single key instead of fetching 50 events + doing
 * the aggregation per dashboard poll.
 */
export async function writeStatsSnapshot(sub: string): Promise<StatsRollup> {
  const stats = await computeStats(sub);
  try {
    await redis.set(snapshotKey(sub), JSON.stringify(stats));
  } catch (err) {
    console.warn('[cm/statsRollup] snapshot write failed:', sub, err);
  }
  return stats;
}

/**
 * Read the snapshot if fresh enough; otherwise compute on-the-fly. Used by
 * /api/stats. Treats snapshots older than 1h as stale.
 */
export async function readStatsSnapshot(sub: string): Promise<StatsRollup> {
  try {
    const raw = await redis.get(snapshotKey(sub));
    if (raw) {
      const parsed = JSON.parse(raw) as StatsRollup;
      if (parsed.computedAt > Date.now() - 3_600_000) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn(
      '[cm/statsRollup] snapshot read failed (falling through to compute):',
      sub,
      err
    );
  }
  return computeStats(sub);
}
