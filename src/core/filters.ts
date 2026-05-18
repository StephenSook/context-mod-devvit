/**
 * Filter eval — ports FoxxMD's `RunnableBase` filter logic (`itemIs` / `authorIs`)
 * into a pure predicate over `Item` + `Author`. Used as a pre-check gate by Step
 * 1.10 (runCheck): if filters fail, the check is skipped entirely.
 */

import type {
  FilterSpec,
  AuthorFilter,
  ItemFilter,
  Item,
  Author,
} from '../shared/types';

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
  if (
    f.flairTextIn &&
    (a.flairText == null || !f.flairTextIn.includes(a.flairText))
  )
    return false;
  if (
    f.flairTextNotIn &&
    a.flairText != null &&
    f.flairTextNotIn.includes(a.flairText)
  )
    return false;
  if (f.ageMinSec != null && a.age < f.ageMinSec) return false;
  if (f.ageMaxSec != null && a.age > f.ageMaxSec) return false;
  if (f.linkKarmaMin != null && a.linkKarma < f.linkKarmaMin) return false;
  if (f.linkKarmaMax != null && a.linkKarma > f.linkKarmaMax) return false;
  if (f.commentKarmaMin != null && a.commentKarma < f.commentKarmaMin)
    return false;
  if (f.commentKarmaMax != null && a.commentKarma > f.commentKarmaMax)
    return false;
  if (f.isMod != null && a.isMod !== f.isMod) return false;
  if (f.isContributor != null && a.isContributor !== f.isContributor)
    return false;
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
  // Invalid filter regex MUST not throw — mirrors
  // src/rules/regex.ts try/catch pattern. Bad pattern → filter-failed = skip.
  // (Parse-time validator + catastrophic-backtracking detection deferred
  // post-hackathon — tracked as MED/LOW Codex findings.)
  if (f.titleMatches && !safeRegexTest(f.titleMatches, i.title, 'titleMatches'))
    return false;
  if (f.bodyMatches && !safeRegexTest(f.bodyMatches, i.body, 'bodyMatches'))
    return false;
  if (f.urlMatches && !safeRegexTest(f.urlMatches, i.url, 'urlMatches'))
    return false;
  return true;
}

function safeRegexTest(
  pattern: string,
  target: string,
  fieldName: string
): boolean {
  try {
    return new RegExp(pattern).test(target);
  } catch (err) {
    console.error(
      '[cm/filters] invalid',
      fieldName,
      'pattern — treating as non-match:',
      pattern,
      err
    );
    return false;
  }
}

// Re-export the field-level helpers for unit testing.
export const _testing = { passesAuthor, passesItem };
