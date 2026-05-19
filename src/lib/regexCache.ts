import safeRegex from 'safe-regex';

/**
 * Shared RegExp compile cache + safe-regex guard.
 *
 * AE Polish #35: extracted from src/rules/regex.ts so both the rule path
 * (`runRegexRule`) AND the filter path (`filters.titleMatches/bodyMatches/
 * urlMatches`) can share one cache + one safe-regex enforcement point.
 *
 * Before extraction: src/core/filters.ts had its OWN `safeRegexTest` that
 * (a) compiled fresh `new RegExp()` on EVERY filter eval (no cache) and
 * (b) lacked the safe-regex catastrophic-backtracking guard from
 * Pull-Forward #8. So a mod's `titleMatches: '(a+)+$'` filter on a
 * popular sub would pin the event loop on every post submission —
 * exactly the DoS Pull-Forward #8 was meant to prevent.
 *
 * **AE Polish #45 — known safe-regex limitation**: `safe-regex` v2.x
 * only analyzes star-height on the basic NFA. It does NOT detect ReDoS
 * patterns using BACKREFERENCES (`/^(.*?)\1+$/`) or LOOKAROUNDS
 * (`/^(?=(a+))\1*$/`) — both V8-supported, both catastrophic on
 * adversarial inputs. These patterns slip through `safeRegex(re)` and
 * still pin the event loop. Mitigation: input-length truncation in
 * `safeTest()` below caps worst-case runtime even when the pattern is
 * malicious. Bounded input → bounded worst-case backtrack. Doesn't
 * make the regex SAFE, but keeps the event loop responsive.
 *
 * Same Module-level Map approach: keyed on `pattern\0flags` (NUL separator
 * prevents `pattern="a",flags="b"` colliding with `pattern="ab",flags=""`).
 * Invalid patterns AND safe-regex-rejected patterns cache as `null` so we
 * don't re-warn on every retry of the same bad pattern.
 *
 * Cache size: unbounded by design. Config sizes are small (dozens of rules
 * per sub, not thousands); per-install cache plateaus at config size.
 */
const COMPILE_CACHE = new Map<string, RegExp | null>();

/**
 * AE Polish #45 — input-length cap for `.test()`. Caps adversarial-input
 * worst-case backtracking time even when safe-regex missed a catastrophic
 * pattern (backref/lookaround bypass — see module-level docblock).
 *
 * 100KB is generous for Reddit title (300 char limit) + body (~40KB limit
 * on text posts) + URL (max ~2KB practical). The cap only fires on
 * adversarial-sized inputs where the regex would already be a problem.
 */
const MAX_REGEX_INPUT_CHARS = 100_000;

/**
 * Bounded `.test()` — truncates the target to MAX_REGEX_INPUT_CHARS before
 * calling RegExp.test(). Use this anywhere we test a wiki-controlled
 * pattern against a Reddit-controlled string (rule regex match, filter
 * regex match) to bound worst-case backtracking time.
 *
 * AE Polish #72: gemini-agent P1-5 finding. Previously called
 * `re.test(bounded)` directly. For a cached RegExp compiled with the
 * `g` or `y` flag, RegExp.test() ADVANCES `re.lastIndex` on a match
 * (V8 sticky-mode semantics). Next call to safeTest with the SAME
 * compiled instance starts the search FROM that offset → false-
 * negatives for any subsequent test against a shorter string OR
 * against text that doesn't contain the pattern at or after that
 * offset. getCompiledRegex now strips `g`/`y` at compile time so
 * cached regexes have no statefulness, but `lastIndex = 0` here is
 * a belt-and-suspenders defense for callers that bypass the cache
 * (currently none, but the API surface is public + future safety).
 */
export function safeTest(re: RegExp, target: string): boolean {
  re.lastIndex = 0;
  const bounded =
    target.length > MAX_REGEX_INPUT_CHARS ? target.slice(0, MAX_REGEX_INPUT_CHARS) : target;
  return re.test(bounded);
}

export function getCompiledRegex(
  pattern: string,
  flags: string,
  tag: string = 'cm/lib/regex-cache'
): RegExp | null {
  // AE Polish #72: strip `g` and `y` flags before compile. RegExp.test()
  // on a stateful regex (`g`/`y`) advances `lastIndex` on a match, so a
  // cached instance reused across rule evaluations returns false-
  // negatives starting from the second matching call against a string
  // shorter than `lastIndex`. Schema at src/shared/types.ts:104 allows
  // RegexRule.flags to be any string, including `"g"`. Stripping at
  // compile keeps semantics identical for .test() (which only returns
  // boolean — `g`/`y` only matter for .exec/.matchAll/.replace) and
  // eliminates the bug class entirely.
  const sanitizedFlags = flags.replace(/[gy]/g, '');
  const key = `${pattern}\x00${sanitizedFlags}`;
  if (COMPILE_CACHE.has(key)) return COMPILE_CACHE.get(key) ?? null;
  try {
    const re = new RegExp(pattern, sanitizedFlags);
    // Pull-Forward #8 — catastrophic-backtracking guard. A pattern like
    // `(a+)+$` against an adversarial body pins the event loop for seconds.
    // `safe-regex` static-analyzes the NFA shape to reject star-height >1.
    if (!safeRegex(re)) {
      console.error(
        `[${tag}] pattern rejected by safe-regex (catastrophic-backtracking risk) — treating as non-match:`,
        pattern
      );
      COMPILE_CACHE.set(key, null);
      return null;
    }
    COMPILE_CACHE.set(key, re);
    return re;
  } catch (err) {
    console.error(`[${tag}] invalid pattern — treating as non-match:`, pattern, err);
    COMPILE_CACHE.set(key, null);
    return null;
  }
}

/** Exposed for tests — clears the compile cache between cases. */
export function _resetRegexCache(): void {
  COMPILE_CACHE.clear();
}
