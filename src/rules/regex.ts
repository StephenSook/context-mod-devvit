import type { RegexRule, Item, RuleResult } from '../shared/types';

/**
 * AE Pull-Forward #5 — RegExp compile cache.
 *
 * Agent A finding #3: previously `new RegExp(rule.pattern, rule.flags)` ran
 * on EVERY rule evaluation. On a 20-regex config evaluated against every
 * post/comment, that's 20 fresh compiles per event. Modern V8 caches RegExp
 * objects only when the SAME literal appears in the same callsite — runtime-
 * constructed RegExps via `new RegExp(...)` are NOT auto-cached.
 *
 * Module-level Map keyed on `pattern\0flags` (NUL separator so `pattern="a",
 * flags="b"` doesn't collide with `pattern="ab", flags=""`). Cache lives for
 * the lifetime of the Devvit process. Invalid patterns are cached as `null`
 * so we don't re-throw + re-log on every retry of the same bad pattern.
 *
 * Cache size: unbounded by design. Config sizes are small (mods write
 * dozens of rules, not thousands); a per-install cache will plateau at
 * the config rule count + never recycle in practice.
 */
const COMPILE_CACHE = new Map<string, RegExp | null>();

function getCompiled(pattern: string, flags: string): RegExp | null {
  const key = `${pattern}\x00${flags}`;
  if (COMPILE_CACHE.has(key)) return COMPILE_CACHE.get(key) ?? null;
  try {
    const re = new RegExp(pattern, flags);
    COMPILE_CACHE.set(key, re);
    return re;
  } catch (err) {
    console.error('[cm/rules/regex] invalid pattern — treating as non-match:', pattern, err);
    COMPILE_CACHE.set(key, null);
    return null;
  }
}

export function runRegexRule(rule: RegexRule, item: Item): RuleResult {
  const target = rule.target ?? 'title';
  const haystack = target === 'title' ? item.title : target === 'body' ? item.body : item.url;
  const re = getCompiled(rule.pattern, rule.flags ?? '');
  if (re === null) return { triggered: false };
  return { triggered: re.test(haystack) };
}

/** Exposed for tests — clears the compile cache between cases. */
export function _resetRegexCache(): void {
  COMPILE_CACHE.clear();
}
