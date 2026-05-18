/**
 * Phase 4 — RecentActivityRule (Plan Step 4.5).
 *
 * Counts the author's recent posts + comments that landed in any of the
 * configured target subs (case-insensitive name match). Triggers when EITHER
 * `postCountGt` OR `commentCountGt` is exceeded — same OR-of-thresholds
 * shape as HistoryRule.
 *
 * Like HistoryRule, the counts are capped at the cache's FETCH_LIMIT (100).
 * Good enough for "this user has 10+ comments in r/spam" but won't see past
 * the most-recent 100 items of either listing.
 */

import type { RecentActivityRule, RuleResult } from '../shared/types';
import { getAuthorHistory } from '../state/authorHistory';

const SUB_DEFAULT = '_';

export async function runRecentActivityRule(
  rule: RecentActivityRule,
  authorName: string,
  sub: string = SUB_DEFAULT,
): Promise<RuleResult> {
  if (!authorName || !rule.subreddits?.length) return { triggered: false };

  const targets = new Set(rule.subreddits.map((s) => s.toLowerCase()));
  const hist = await getAuthorHistory(authorName, sub);

  const postCount = hist.posts.filter((p) => targets.has(p.subredditName.toLowerCase())).length;
  const commentCount = hist.comments.filter((c) => targets.has(c.subredditName.toLowerCase())).length;

  if (rule.postCountGt != null && postCount > rule.postCountGt) return { triggered: true };
  if (rule.commentCountGt != null && commentCount > rule.commentCountGt) return { triggered: true };
  return { triggered: false };
}
