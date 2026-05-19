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

// AE Polish #78: gemini brutal-audit P1-8. The previous read path cast
// JSON.parse output to `ModActivity` unchecked. A poisoned blob (Redis
// FLUSHDB during a deploy, version-drift across a schema migration, or
// a partial write from a crashed worker) would propagate silently —
// the dashboard would later access `.actor` / `.kind` / `.ts` and
// either render `undefined` or throw at a render site far from the
// source. Mirror the isValidRecentEventShape (Polish #5) and
// isValidImageHashEntry (Polish #64) discipline: validate each field
// before trust. Self-heals: caller drops bad entries; the ZSET trim on
// the next write evicts them.
function isValidModActivity(o: unknown): o is ModActivity {
  if (!o || typeof o !== 'object') return false;
  const m = o as Record<string, unknown>;
  if (typeof m.ts !== 'number' || !Number.isFinite(m.ts)) return false;
  if (typeof m.actor !== 'string' || m.actor.length === 0) return false;
  if (typeof m.kind !== 'string') return false;
  const valid: ModActivityKind[] = [
    'reload-config',
    'recent-actions',
    'test-rules',
    'simulate-rule',
    'explain-rule',
    'mute-rule',
    'unmute-rule',
  ];
  if (!valid.includes(m.kind as ModActivityKind)) return false;
  if (m.detail !== undefined && typeof m.detail !== 'string') return false;
  return true;
}

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
    const entries = await redis.zRange(key, 0, -1, {
      by: 'score',
      reverse: true,
    });
    let parseFails = 0;
    let shapeFails = 0;
    const parsed = entries
      .map((e) => {
        let raw: unknown;
        try {
          raw = JSON.parse(e.member);
        } catch {
          parseFails++;
          return null;
        }
        // Polish #78: shape-validate before trusting the cast.
        if (!isValidModActivity(raw)) {
          shapeFails++;
          return null;
        }
        return raw;
      })
      .filter((x): x is ModActivity => x !== null);
    if (parseFails > 0 || shapeFails > 0) {
      console.warn('[cm/modActivity] dropped corrupt/invalid members:', {
        sub,
        parseFails,
        shapeFails,
        totalEntries: entries.length,
      });
    }
    return parsed;
  } catch (err) {
    console.warn('[cm/modActivity] read failed:', err);
    return [];
  }
}

// Re-export K for tests that need to inspect the key shape.
export { K };
