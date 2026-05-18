/**
 * URL-dedupe repost rule (Phase 2.5, Council Expansionist — promoted from Phase 4
 * because it's the screenshot moment that differentiates this from an AutoMod port).
 *
 * Reuses the FNV-1a64 substrate from src/lib/idem.ts — no new primitive, same
 * dedup shape as `cm:action:done:{hash}`. Sub-scoped via the K.* keys (kept
 * tenant-isolated from day 0 per Long-Term Architect, Council 2026-05-14 21:30).
 *
 * Semantics (race-safe SET NX, Codex HIGH fix 2026-05-16):
 *   - First submission of a URL:  `SET key id NX EX 30d` returns 'OK' → no trigger
 *   - Second submission of same:  `SET key id NX EX 30d` returns non-OK → trigger + TTL refresh
 *   - Empty/missing URL:          no-op (regex rules can chain for those)
 *
 * SRE non-negotiable: ship behind `config.dryRun: true` — false positives nuke
 * legitimate crossposts, news threads, weekly recurring posts. Mods opt into live
 * mode after watching the dry-run feed for a few days. See Step 2.5.2 in the plan.
 *
 * Prior GET-then-SET version had a TOCTOU race: two simultaneous submissions of
 * the same URL both missed the GET, both SET, both failed to trigger. NX flips
 * the check into a single atomic op — Devvit Redis returns 'OK' iff the key was
 * newly created, otherwise the call is a no-op and we treat that as repost.
 */

import { redis } from '@devvit/web/server';
import type { RepostRule, Item, RuleResult } from '../shared/types';
import { fnv1a64 } from '../lib/idem';

const DEFAULT_WINDOW_DAYS = 30;
const SUB_DEFAULT = '_';

export async function runRepostRule(
  rule: RepostRule,
  item: Item,
  sub: string = SUB_DEFAULT
): Promise<RuleResult> {
  if (!item.url) return { triggered: false };
  const urlHash = fnv1a64(item.url);
  const key = `cm:${sub}:repost:url:${urlHash}`;
  const windowDays = rule.windowDays ?? DEFAULT_WINDOW_DAYS;
  const expiration = new Date(Date.now() + windowDays * 86_400 * 1000);

  try {
    const result = await redis.set(key, item.id, { nx: true, expiration });
    if (result === 'OK') {
      // Newly-set marker — first submission of this URL in the window.
      return { triggered: false };
    }
    // NX failed → key already existed → repost. Refresh TTL (non-NX SET) so an
    // active-repost loop doesn't expire and re-allow itself mid-week.
    await redis.set(key, item.id, { expiration });
    return { triggered: true };
  } catch (err) {
    // Fail-OPEN on Redis error — repost is a soft signal, not a safety gate.
    // Bias toward letting posts through rather than mass-flagging during outage.
    console.error(
      '[cm/rules/repost] redis err — fail-open (no trigger):',
      item.id,
      err
    );
    return { triggered: false };
  }
}
