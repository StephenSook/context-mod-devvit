/**
 * URL-dedupe repost rule (Phase 2.5, Council Expansionist — promoted from Phase 4
 * because it's the screenshot moment that differentiates this from an AutoMod port).
 *
 * Reuses the FNV-1a64 substrate from src/lib/idem.ts — no new primitive, same
 * dedup shape as `cm:action:done:{hash}`. Sub-scoped via the K.* keys (kept
 * tenant-isolated from day 0 per Long-Term Architect, Council 2026-05-14 21:30).
 *
 * Semantics:
 *   - First submission of a URL:  set `cm:{sub}:repost:url:{hash}` (30d TTL), no trigger
 *   - Second submission of same:  the key exists → trigger
 *   - Empty/missing URL:          no-op (regex rules can chain for those)
 *
 * SRE non-negotiable: ship behind `config.dryRun: true` — false positives nuke
 * legitimate crossposts, news threads, weekly recurring posts. Mods opt into live
 * mode after watching the dry-run feed for a few days. See Step 2.5.2 in the plan.
 *
 * Devvit Redis has no Lua/transactions, so the check-then-set window has a TOCTOU
 * race: two simultaneous submissions of the same URL both miss the GET, both SET,
 * both fail to trigger. In practice human posting cadence makes this near-zero;
 * the rule isn't life-safety-critical, so we accept the race for v1.
 */

import { redis } from '@devvit/web/server';
import type { RepostRule, Item, RuleResult } from '../shared/types';
import { fnv1a64 } from '../lib/idem';

const DEFAULT_WINDOW_DAYS = 30;
const SUB_DEFAULT = '_';

export async function runRepostRule(
  rule: RepostRule,
  item: Item,
  sub: string = SUB_DEFAULT,
): Promise<RuleResult> {
  if (!item.url) return { triggered: false };
  const urlHash = fnv1a64(item.url);
  const key = `cm:${sub}:repost:url:${urlHash}`;
  const windowDays = rule.windowDays ?? DEFAULT_WINDOW_DAYS;

  try {
    const seen = await redis.get(key);
    if (seen) {
      // Refresh the TTL on a hit so an active-repost loop doesn't expire and
      // re-allow itself mid-week. Re-set with the same value + a fresh TTL.
      await redis.set(key, seen, {
        expiration: new Date(Date.now() + windowDays * 86_400 * 1000),
      });
      return { triggered: true };
    }
    await redis.set(key, item.id, {
      expiration: new Date(Date.now() + windowDays * 86_400 * 1000),
    });
    return { triggered: false };
  } catch (err) {
    // Fail-OPEN on Redis error — repost is a soft signal, not a safety gate.
    // Bias toward letting posts through rather than mass-flagging during outage.
    console.error('[cm/rules/repost] redis err — fail-open (no trigger):', item.id, err);
    return { triggered: false };
  }
}
