/**
 * Rule dispatcher — selects the rule implementation by `kind` and returns
 * `{ triggered }`. NamedRuleRef must already be expanded (Step 1.7 runs at
 * config-parse time, not here) — if a `named` ref leaks through it's a bug
 * upstream, throw loud rather than silently skipping.
 *
 * `sub` is optional and threads down to rules with sub-scoped Redis state
 * (currently only `repost`). Callers without a subreddit context (unit tests,
 * pre-trigger code paths) can omit it — the repost rule falls back to the
 * sentinel `'_'` like every other K.* default.
 */

import type { Rule, Item, Author, RuleResult } from '../shared/types';
import { runRegexRule } from '../rules/regex';
import { runAuthorRule } from '../rules/author';
import { runRuleSet } from '../rules/ruleset';
import { runRepostRule } from '../rules/repost';

export async function runRule(rule: Rule, item: Item, author: Author, sub?: string): Promise<RuleResult> {
  switch (rule.kind) {
    case 'regex':   return runRegexRule(rule, item);
    case 'author':  return runAuthorRule(rule, item, author);
    case 'ruleset': return runRuleSet(rule, item, author, sub);
    case 'repost':  return runRepostRule(rule, item, sub);
    case 'named':
      throw new Error(`runRule: encountered un-expanded named rule "${rule.name}" — expandNamedRules must run at config-parse time`);
  }
}
