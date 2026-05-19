/**
 * Filter eval — ports FoxxMD's `RunnableBase` filter logic (`itemIs` / `authorIs`)
 * into a pure predicate over `Item` + `Author`. Used as a pre-check gate by Step
 * 1.10 (runCheck): if filters fail, the check is skipped entirely.
 */

import type { FilterSpec, AuthorFilter, ItemFilter, Item, Author } from '../shared/types';
import { getCompiledRegex, safeTest } from '../lib/regexCache';

export function passesFilters(
  filters: FilterSpec | undefined,
  item: Item,
  author: Author
): boolean {
  if (!filters) return true;
  if (filters.authorIs && !passesAuthor(filters.authorIs, author)) return false;
  if (filters.itemIs && !passesItem(filters.itemIs, item)) return false;
  return true;
}

function passesAuthor(f: AuthorFilter, a: Author): boolean {
  if (f.nameIn && !f.nameIn.includes(a.name)) return false;
  if (f.nameNotIn && f.nameNotIn.includes(a.name)) return false;
  if (f.flairTextIn && (a.flairText == null || !f.flairTextIn.includes(a.flairText))) return false;
  if (f.flairTextNotIn && a.flairText != null && f.flairTextNotIn.includes(a.flairText))
    return false;
  if (f.ageMinSec != null && a.age < f.ageMinSec) return false;
  if (f.ageMaxSec != null && a.age > f.ageMaxSec) return false;
  if (f.linkKarmaMin != null && a.linkKarma < f.linkKarmaMin) return false;
  if (f.linkKarmaMax != null && a.linkKarma > f.linkKarmaMax) return false;
  if (f.commentKarmaMin != null && a.commentKarma < f.commentKarmaMin) return false;
  if (f.commentKarmaMax != null && a.commentKarma > f.commentKarmaMax) return false;
  if (f.isMod != null && a.isMod !== f.isMod) return false;
  if (f.isContributor != null && a.isContributor !== f.isContributor) return false;
  if (f.verified != null && a.verified !== f.verified) return false;
  if (f.shadowBanned != null && a.shadowBanned !== f.shadowBanned) return false;
  return true;
}

function passesItem(f: ItemFilter, i: Item): boolean {
  if (f.over18 != null && i.over18 !== f.over18) return false;
  if (f.locked != null && i.locked !== f.locked) return false;
  if (f.stickied != null && i.stickied !== f.stickied) return false;
  if (f.removed != null && i.removed !== f.removed) return false;
  if (f.approved != null && i.approved !== f.approved) return false;
  if (f.isSelf != null && i.isSelf !== f.isSelf) return false;
  if (f.scoreMin != null && i.score < f.scoreMin) return false;
  if (f.scoreMax != null && i.score > f.scoreMax) return false;
  if (
    f.linkFlairTextIn &&
    (i.linkFlairText == null || !f.linkFlairTextIn.includes(i.linkFlairText))
  )
    return false;
  if (
    f.linkFlairTextNotIn &&
    i.linkFlairText != null &&
    f.linkFlairTextNotIn.includes(i.linkFlairText)
  )
    return false;
  // AE Polish #35: filter regex uses the SHARED compile cache + safe-regex
  // guard from src/lib/regexCache.ts. Previously this had its own
  // `safeRegexTest` that (a) compiled fresh `new RegExp()` per call (no
  // cache) and (b) was misnamed — actually NOT safe-regex protected, so a
  // mod's `titleMatches: '(a+)+$'` filter on a popular sub would pin the
  // event loop on every post submission. Same attack surface as the rule
  // regex path that Pull-Forward #8 hardened.
  if (f.titleMatches && !cachedRegexTest(f.titleMatches, i.title, 'titleMatches')) return false;
  if (f.bodyMatches && !cachedRegexTest(f.bodyMatches, i.body, 'bodyMatches')) return false;
  if (f.urlMatches && !cachedRegexTest(f.urlMatches, i.url, 'urlMatches')) return false;
  return true;
}

function cachedRegexTest(pattern: string, target: string, fieldName: string): boolean {
  const re = getCompiledRegex(pattern, '', `cm/filters/${fieldName}`);
  if (re === null) return false; // bad pattern OR safe-regex rejected → non-match
  // AE Polish #45: bounded .test() — defense against backref/lookaround
  // ReDoS patterns that safe-regex misses. Caps worst-case adversarial-
  // input runtime so event loop stays responsive.
  return safeTest(re, target);
}

// Re-export the field-level helpers for unit testing.
export const _testing = { passesAuthor, passesItem };
