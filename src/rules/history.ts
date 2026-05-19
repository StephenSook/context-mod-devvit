/**
 * Phase 4 — HistoryRule (Plan Step 4.3).
 *
 * Reads cached author posts/comments counts + karma off the enriched Author.
 * Predicate is OR-of-thresholds: any single supplied threshold being met
 * triggers the rule. Mods can layer multiple HistoryRules inside an AND
 * RuleSet for narrower targeting.
 *
 * The "counts" come from the cached listings — which means they're caps of
 * 100 (the cache's FETCH_LIMIT). A `postCountGt: 200` will never trigger.
 * That's a deliberate v1 trade-off: paginating the whole user history per
 * event is what the cache was specifically introduced to avoid.
 */

import type { HistoryRule, Author, RuleResult } from '../shared/types';
import { getAuthorHistory } from '../state/authorHistory';

const SUB_DEFAULT = '_';

export async function runHistoryRule(
  rule: HistoryRule,
  author: Author,
  sub: string = SUB_DEFAULT
): Promise<RuleResult> {
  const hist = await getAuthorHistory(author.name, sub);
  // AE CRITICAL #5: skip if Reddit-degraded. The empty arrays in a
  // degraded history are NOT ground truth — they're a Reddit-API throw
  // we silently caught. Evaluating `commentCountLt: 5` against a fake-
  // zero would mass-flag every user during a 429/5xx outage.
  if (hist.degraded) return { triggered: false };
  // AE Pull-Forward #9 — optional windowSec gate. Counts only entries whose
  // createdAtMs is within the last N seconds. Without it, the rule sees
  // the full 1h cache (up to FETCH_LIMIT=100 items). Upstream FoxxMD CM
  // supports this as a `window` field per rule.
  const cutoffMs = rule.windowSec ? Date.now() - rule.windowSec * 1000 : 0;
  const postCount = cutoffMs
    ? hist.posts.filter((p) => p.createdAtMs >= cutoffMs).length
    : hist.posts.length;
  const commentCount = cutoffMs
    ? hist.comments.filter((c) => c.createdAtMs >= cutoffMs).length
    : hist.comments.length;

  if (rule.postCountLt != null && postCount < rule.postCountLt) return { triggered: true };
  if (rule.postCountGt != null && postCount > rule.postCountGt) return { triggered: true };
  if (rule.commentCountLt != null && commentCount < rule.commentCountLt) return { triggered: true };
  if (rule.commentCountGt != null && commentCount > rule.commentCountGt) return { triggered: true };
  if (rule.linkKarmaLt != null && author.linkKarma < rule.linkKarmaLt) return { triggered: true };
  if (rule.linkKarmaGt != null && author.linkKarma > rule.linkKarmaGt) return { triggered: true };
  if (rule.commentKarmaLt != null && author.commentKarma < rule.commentKarmaLt)
    return { triggered: true };
  if (rule.commentKarmaGt != null && author.commentKarma > rule.commentKarmaGt)
    return { triggered: true };

  return { triggered: false };
}
