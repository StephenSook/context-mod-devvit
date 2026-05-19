import type { RegexRule, Item, RuleResult } from '../shared/types';
import { getCompiledRegex, safeTest, _resetRegexCache } from '../lib/regexCache';

/**
 * AE Pull-Forward #5 — RegExp compile cache (now extracted to
 * src/lib/regexCache.ts per AE Polish #35 so filters.ts can share it).
 *
 * Agent A finding #3: previously `new RegExp(rule.pattern, rule.flags)` ran
 * on EVERY rule evaluation. On a 20-regex config evaluated against every
 * post/comment, that's 20 fresh compiles per event.
 */
export function runRegexRule(rule: RegexRule, item: Item): RuleResult {
  const target = rule.target ?? 'title';
  const haystack = target === 'title' ? item.title : target === 'body' ? item.body : item.url;
  const re = getCompiledRegex(rule.pattern, rule.flags ?? '', 'cm/rules/regex');
  if (re === null) return { triggered: false };
  // AE Polish #45: bounded .test() in case safe-regex missed a backref /
  // lookaround ReDoS pattern. Caps worst-case adversarial input at
  // MAX_REGEX_INPUT_CHARS so the event loop stays responsive.
  return { triggered: safeTest(re, haystack) };
}

export { _resetRegexCache };
