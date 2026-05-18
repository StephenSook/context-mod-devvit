/**
 * Wave S Phase S3 — Mod activity log.
 *
 * Captures mod-menu actions (reload-config, dry-run, simulate, explain, mute)
 * w/ actor username + timestamp so the dashboard can show "u/X ran Reload config
 * at HH:MM" — provenance + mod-trust signal.
 *
 * Storage: `cm:mod-activity:{sub}` ZSET, 50-deep ring buffer, score=ts member=JSON.
 */

import { redis } from '@devvit/web/server';
import { K } from './keys';

export type ModActivityKind =
  | 'reload-config'
  | 'recent-actions'
  | 'test-rules'
  | 'simulate-rule'
  | 'explain-rule'
  | 'mute-rule'
  | 'unmute-rule';

export interface ModActivity {
  ts: number;
  actor: string;
  kind: ModActivityKind;
  detail?: string;
}

const RING_SIZE = 50;

export async function logModActivity(sub: string | undefined, entry: ModActivity): Promise<void> {
  if (!sub) return;
  try {
    const key = `cm:mod-activity:${sub}`;
    await redis.zAdd(key, { score: entry.ts, member: JSON.stringify(entry) });
    await redis.zRemRangeByRank(key, 0, -(RING_SIZE + 1));
  } catch (err) {
    // Structured warn for ops visibility while keeping the soft-fail
    // — audit log is non-critical telemetry, mod action already happened.
    console.warn('[cm/modActivity] log failed (non-fatal):', {
      sub,
      kind: entry.kind,
      actor: entry.actor,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function readModActivity(sub: string | undefined): Promise<ModActivity[]> {
  if (!sub) return [];
  try {
    const key = `cm:mod-activity:${sub}`;
    const entries = await redis.zRange(key, 0, -1, { by: 'score', reverse: true });
    let parseFails = 0;
    const parsed = entries
      .map((e) => {
        try {
          return JSON.parse(e.member) as ModActivity;
        } catch {
          parseFails++;
          return null;
        }
      })
      .filter((x): x is ModActivity => x !== null);
    if (parseFails > 0) {
      console.warn('[cm/modActivity] dropped corrupt members:', { sub, parseFails, totalEntries: entries.length });
    }
    return parsed;
  } catch (err) {
    console.warn('[cm/modActivity] read failed:', err);
    return [];
  }
}

// Re-export K for tests that need to inspect the key shape.
export { K };
