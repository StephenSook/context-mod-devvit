/**
 * Phase 4 — AttributionRule (Plan Step 4.4).
 *
 * Counts what fraction of an author's recent posts link to one of the
 * configured domains. Trigger fires when matching% ≥ `domainPercent`.
 *
 * Domain match is case-insensitive substring on `post.domain` — so a config
 * with `domains: ['youtube.com']` catches both `www.youtube.com` and
 * `m.youtube.com`, and `['shop']` catches anything with "shop" in the host.
 * That's loose by design: drive-by self-promo lives on a long tail of
 * vanity TLDs and shorteners; an over-strict matcher misses too many.
 *
 * `minPosts` guards against the small-sample trap (1/1 = 100% is meaningless).
 * Default 5 — under that, the rule never fires regardless of percent.
 */

import type { AttributionRule, RuleResult } from '../shared/types';
import { getAuthorHistory } from '../state/authorHistory';

const SUB_DEFAULT = '_';
const DEFAULT_MIN_POSTS = 5;

export async function runAttributionRule(
  rule: AttributionRule,
  authorName: string,
  sub: string = SUB_DEFAULT,
): Promise<RuleResult> {
  if (!authorName || !rule.domains?.length) return { triggered: false };

  const hist = await getAuthorHistory(authorName, sub);
  const total = hist.posts.length;
  const minPosts = rule.minPosts ?? DEFAULT_MIN_POSTS;
  if (total < minPosts) return { triggered: false };

  const needles = rule.domains.map((d) => d.toLowerCase());
  const matching = hist.posts.filter((p) => {
    if (!p.domain) return false;
    const haystack = p.domain.toLowerCase();
    return needles.some((n) => haystack.includes(n));
  }).length;

  const pct = (matching / total) * 100;
  return { triggered: pct >= rule.domainPercent };
}
