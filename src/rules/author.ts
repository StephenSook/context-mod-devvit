import type { AuthorRule, Item, Author, RuleResult } from '../shared/types';
import { passesFilters } from '../core/filters';

/**
 * AuthorRule reuses the FilterSpec.authorIs predicate set. CM treats it as a
 * rule (not just a filter) so the trigger state machine sees author-based
 * decisions in the rule sequence — same predicates, different framing.
 */
export function runAuthorRule(
  rule: AuthorRule,
  item: Item,
  author: Author
): RuleResult {
  return { triggered: passesFilters({ authorIs: rule.filter }, item, author) };
}
