import type { RuleSetRule, Item, Author, RuleResult } from '../shared/types';
import { runRule } from '../core/runRule';

/**
 * Nested rule combinator: AND / OR / NOT.
 *
 * Short-circuits per combinator:
 *   - AND stops on first false → returns false (any miss = no trigger)
 *   - OR  stops on first true  → returns true  (any hit = trigger)
 *   - NOT stops on first true  → returns false (any hit = NOT-triggered)
 *     AE Pull-Forward #3 upstream FoxxMD parity — use case: "catch new
 *     accounts EXCEPT trusted contributors" — wrap the trust check in NOT
 *     inside an outer AND combinator.
 *
 * Empty-list semantics: empty AND/OR/NOT all return {triggered: false}.
 * Default-false matches the namedRules cycle-break convention (empty
 * AND-ruleset = "never triggers") + avoids the gotcha where an empty NOT
 * would otherwise vacuously trigger every check.
 *
 * Cycles into runRule (the dispatcher) so nested rulesets compose for
 * arbitrary boolean expressions.
 */
export async function runRuleSet(
  rule: RuleSetRule,
  item: Item,
  author: Author,
  sub?: string
): Promise<RuleResult> {
  if (rule.rules.length === 0) {
    return { triggered: false };
  }
  if (rule.combinator === 'AND') {
    for (const r of rule.rules) {
      const res = await runRule(r, item, author, sub);
      if (!res.triggered) return { triggered: false };
    }
    return { triggered: true };
  }
  if (rule.combinator === 'NOT') {
    for (const r of rule.rules) {
      const res = await runRule(r, item, author, sub);
      if (res.triggered) return { triggered: false };
    }
    return { triggered: true };
  }
  // OR
  for (const r of rule.rules) {
    const res = await runRule(r, item, author, sub);
    if (res.triggered) return { triggered: true };
  }
  return { triggered: false };
}
