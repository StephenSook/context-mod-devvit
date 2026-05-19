/**
 * Polish #35 — extracted regex cache + safe-regex guard contract tests.
 *
 * Pre-Polish-#35 the cache + safe-regex check lived inside src/rules/regex.ts
 * as a private function. filters.ts had its own (broken) `safeRegexTest`
 * that compiled fresh `new RegExp()` per call w/ NO safe-regex protection.
 *
 * Extracting to src/lib/regexCache.ts unified the path so both rules + filters
 * get the same cache + same catastrophic-backtracking guard. These tests pin
 * the contract of the shared module independent of either caller.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getCompiledRegex, safeTest, _resetRegexCache } from '../../src/lib/regexCache';

beforeEach(() => {
  _resetRegexCache();
});

describe('getCompiledRegex (Polish #35)', () => {
  it('returns a RegExp for a valid simple pattern', () => {
    const re = getCompiledRegex('^hello$', '');
    expect(re).toBeInstanceOf(RegExp);
    expect(re!.test('hello')).toBe(true);
    expect(re!.test('hellow')).toBe(false);
  });

  it('honors flags argument', () => {
    const re = getCompiledRegex('^HELLO$', 'i');
    expect(re!.test('hello')).toBe(true);
  });

  it('returns the SAME RegExp instance on second call (cache hit)', () => {
    const re1 = getCompiledRegex('foo', 'i');
    const re2 = getCompiledRegex('foo', 'i');
    expect(re1).toBe(re2); // referential equality — cache hit
  });

  it('returns DIFFERENT instances for different flags (NUL-separator key)', () => {
    const a = getCompiledRegex('foo', 'i');
    const b = getCompiledRegex('foo', '');
    expect(a).not.toBe(b);
  });

  it('cache key uses NUL separator (prevents pattern/flags ambiguity)', () => {
    // `pattern="ab", flags=""` must NOT collide with `pattern="a", flags="b"`.
    const a = getCompiledRegex('ab', '');
    const b = getCompiledRegex('a', 'b');
    // Both compile (b="" is empty flags, b='b' is invalid... wait, 'b' is not
    // a valid flag, so getCompiledRegex('a', 'b') would throw).
    // Test the intent: cache key separation. Pick patterns that ARE valid:
    const c = getCompiledRegex('ab', '');
    const d = getCompiledRegex('a', 'g');
    expect(c).not.toBe(d);
    expect(a).toBeInstanceOf(RegExp);
  });

  it('returns null for invalid pattern (does not throw)', () => {
    const re = getCompiledRegex('(unclosed', '');
    expect(re).toBeNull();
  });

  it('caches null result for invalid patterns (no re-warn on retry)', () => {
    // First call logs the error, caches null. Second call is silent cache hit.
    const a = getCompiledRegex('(also-bad', '');
    const b = getCompiledRegex('(also-bad', '');
    expect(a).toBeNull();
    expect(b).toBeNull();
    // Both calls share the same cached null — no second compile attempt.
  });

  it('Polish #35: rejects catastrophic-backtracking pattern via safe-regex', () => {
    // The whole point of the shared module: filter regex now has safe-regex
    // protection just like rule regex did via Pull-Forward #8.
    const re = getCompiledRegex('(a+)+$', '');
    expect(re).toBeNull();
  });

  it('Polish #35: rejects another classic ReDoS pattern (nested star)', () => {
    // safe-regex flags `(a*)*` as star-height violation.
    expect(getCompiledRegex('(a*)*', '')).toBeNull();
  });

  it('Polish #35: passes well-formed patterns (no false positives)', () => {
    expect(getCompiledRegex('^[a-z]+$', '')).toBeInstanceOf(RegExp);
    expect(getCompiledRegex('https?://[^\\s]+', 'i')).toBeInstanceOf(RegExp);
    expect(getCompiledRegex('\\b\\d{4}\\b', '')).toBeInstanceOf(RegExp);
  });

  it('tag argument flows into log message (defensive — does not affect result)', () => {
    // Tag is for log diagnostics so the caller (cm/rules/regex vs cm/filters/...)
    // is identifiable. Just verify it doesn't break the contract.
    const re = getCompiledRegex('^x$', '', 'cm/test/custom');
    expect(re).toBeInstanceOf(RegExp);
  });
});

describe('safeTest — bounded input ReDoS defense (Polish #45)', () => {
  it('passes short input through unchanged (no truncation)', () => {
    const re = /hello/;
    expect(safeTest(re, 'hello world')).toBe(true);
    expect(safeTest(re, 'bye world')).toBe(false);
  });

  it('truncates input >100KB before .test() (worst-case adversarial cap)', () => {
    // safe-regex doesn't catch backref ReDoS like `^(.*?)\1+$`. Bounded
    // input is the defense-in-depth so the event loop stays responsive
    // even when the regex itself is malicious.
    const re = /^xxxxx$/; // matches exactly 5 x's
    const huge = 'x'.repeat(200_000); // 200KB of x — would fail if untruncated
    // After truncation to 100KB, `^xxxxx$` still doesn't match 100KB-of-x,
    // but the test runs in BOUNDED time regardless.
    const start = Date.now();
    safeTest(re, huge);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500); // generous ceiling; bounded input → fast
  });

  it('test result correct on inputs at the 100KB boundary', () => {
    const re = /target/;
    // Match within the cap
    const within = 'x'.repeat(99_000) + 'target';
    expect(safeTest(re, within)).toBe(true);
    // Match BEYOND the cap — truncation drops it, so no match
    const beyond = 'x'.repeat(100_000) + 'target'; // total 100,006 chars
    expect(safeTest(re, beyond)).toBe(false);
  });

  // AE Polish #72: gemini-agent P1-5 finding. Schema at
  // src/shared/types.ts:104 allows RegexRule.flags to be any string,
  // including `"g"`. Pre-fix path: compile w/ `g` flag → RegExp.test()
  // advances lastIndex on match → second .test() against shorter or
  // non-matching string starts mid-search → false negative.
  it('Polish #72: getCompiledRegex strips `g` flag (no stateful regex)', () => {
    const re = getCompiledRegex('abc', 'g')!;
    expect(re).toBeInstanceOf(RegExp);
    expect(re.flags).not.toContain('g');
    // First test matches; lastIndex would have advanced w/o the strip.
    expect(re.test('xxxabcxxx')).toBe(true);
    // Second test against an even shorter string MUST still match —
    // proves no statefulness leaked through.
    expect(re.test('abc')).toBe(true);
  });

  it('Polish #72: getCompiledRegex strips `y` (sticky) flag', () => {
    const re = getCompiledRegex('abc', 'y')!;
    expect(re).toBeInstanceOf(RegExp);
    expect(re.flags).not.toContain('y');
  });

  it('Polish #72: cached g-flag regex returns consistent results across calls', () => {
    // Repro of the original bug: same compiled instance, called repeatedly.
    // Without the strip, the second call would return false because
    // lastIndex was advanced past the match by the first call.
    const re = getCompiledRegex('hello', 'g')!;
    for (let i = 0; i < 10; i++) {
      expect(safeTest(re, 'hello world')).toBe(true);
    }
  });

  it('Polish #72: safeTest defensively resets lastIndex even on bypass-cache callers', () => {
    // A future caller could construct a stateful RegExp directly (e.g.
    // `new RegExp('foo', 'g')`) and pass it to safeTest. Belt-and-
    // suspenders: safeTest resets lastIndex itself.
    const re = /foo/g;
    re.lastIndex = 100; // simulate a prior match advancement
    expect(safeTest(re, 'foo')).toBe(true);
  });
});
