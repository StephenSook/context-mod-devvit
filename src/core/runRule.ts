/**
 * Rule dispatcher — selects the rule implementation by `kind` and returns
 * `{ triggered }`. NamedRuleRef must already be expanded (Step 1.7 runs at
 * config-parse time, not here) — if a `named` ref leaks through it's a bug
 * upstream, throw loud rather than silently skipping.
 */

import type { Rule, Item, Author, RuleResult } from '../shared/types';
import { runRegexRule } from '../rules/regex';
import { runAuthorRule } from '../rules/author';
import { runRuleSet } from '../rules/ruleset';

export async function runRule(rule: Rule, item: Item, author: Author): Promise<RuleResult> {
  switch (rule.kind) {
    case 'regex':   return runRegexRule(rule, item);
    case 'author':  return runAuthorRule(rule, item, author);
    case 'ruleset': return runRuleSet(rule, item, author);
    case 'named':
      throw new Error(`runRule: encountered un-expanded named rule "${rule.name}" — expandNamedRules must run at config-parse time`);
  }
}
