import type { RuleSetRule, Item, Author, RuleResult } from '../shared/types';
import { runRule } from '../core/runRule';

/**
 * Nested AND/OR group. Short-circuits: AND stops on first false, OR stops on
 * first true. Cycles into runRule (the dispatcher) so nested rulesets work.
 */
export async function runRuleSet(rule: RuleSetRule, item: Item, author: Author): Promise<RuleResult> {
  if (rule.rules.length === 0) {
    // Empty AND = vacuously true is surprising; empty OR = false is also
    // surprising. Default to false — namedRules cycle break uses an empty
    // AND-ruleset as "never triggers" and depends on this convention.
    return { triggered: false };
  }
  if (rule.combinator === 'AND') {
    for (const r of rule.rules) {
      const res = await runRule(r, item, author);
      if (!res.triggered) return { triggered: false };
    }
    return { triggered: true };
  }
  // OR
  for (const r of rule.rules) {
    const res = await runRule(r, item, author);
    if (res.triggered) return { triggered: true };
  }
  return { triggered: false };
}
