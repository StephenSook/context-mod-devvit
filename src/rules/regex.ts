import type { RegexRule, Item, RuleResult } from '../shared/types';

export function runRegexRule(rule: RegexRule, item: Item): RuleResult {
  const target = rule.target ?? 'title';
  const haystack = target === 'title' ? item.title : target === 'body' ? item.body : item.url;
  let re: RegExp;
  try {
    re = new RegExp(rule.pattern, rule.flags ?? '');
  } catch (err) {
    console.error('[cm/rules/regex] invalid pattern — treating as non-match:', rule.pattern, err);
    return { triggered: false };
  }
  return { triggered: re.test(haystack) };
}
