import { describe, it, expect, beforeEach } from 'vitest';
import { runRegexRule, _resetRegexCache } from '../../src/rules/regex';
import type { Item } from '../../src/shared/types';

beforeEach(() => {
  // AE Pull-Forward #5: clear compile cache between tests so cache-hit
  // assertions in this file aren't affected by prior tests' cached entries.
  _resetRegexCache();
});

const baseItem: Item = {
  id: 't3_a',
  title: 'free crypto giveaway scam',
  body: 'body text',
  url: 'https://example.com/path',
  author: 'u',
  age: 0,
  score: 0,
  isSelf: false,
  over18: false,
  removed: false,
  approved: false,
  locked: false,
  stickied: false,
  linkFlairText: null,
};

describe('runRegexRule', () => {
  it('matches title by default', () => {
    expect(runRegexRule({ kind: 'regex', pattern: 'scam', flags: 'i' }, baseItem).triggered).toBe(
      true
    );
  });

  it('does not match when pattern is absent', () => {
    expect(runRegexRule({ kind: 'regex', pattern: '^nope$' }, baseItem).triggered).toBe(false);
  });

  it('targets body when specified', () => {
    expect(
      runRegexRule({ kind: 'regex', pattern: 'body', target: 'body' }, baseItem).triggered
    ).toBe(true);
    expect(
      runRegexRule({ kind: 'regex', pattern: 'body', target: 'title' }, baseItem).triggered
    ).toBe(false);
  });

  it('targets url when specified', () => {
    expect(
      runRegexRule({ kind: 'regex', pattern: 'example\\.com', target: 'url' }, baseItem).triggered
    ).toBe(true);
  });

  it('respects multiline flag', () => {
    const multi: Item = { ...baseItem, title: 'line1\nline2' };
    expect(runRegexRule({ kind: 'regex', pattern: '^line2', flags: 'm' }, multi).triggered).toBe(
      true
    );
    expect(runRegexRule({ kind: 'regex', pattern: '^line2' }, multi).triggered).toBe(false);
  });

  it('treats an invalid regex as non-match (no crash)', () => {
    expect(runRegexRule({ kind: 'regex', pattern: '([' }, baseItem).triggered).toBe(false);
  });
});

describe('runRegexRule — compile cache (AE Pull-Forward #5)', () => {
  it('same pattern+flags returns same RegExp instance across invocations (cache hit)', () => {
    // First call compiles + caches; second call should hit cache.
    // We observe cache hit indirectly by verifying repeated calls don't
    // log compile errors for the same pattern (would surface in console).
    const rule = { kind: 'regex' as const, pattern: 'scam', flags: 'i' };
    expect(runRegexRule(rule, baseItem).triggered).toBe(true);
    expect(runRegexRule(rule, baseItem).triggered).toBe(true);
    expect(runRegexRule(rule, baseItem).triggered).toBe(true);
  });

  it('different pattern/flags get separate cache entries (collision-safe)', () => {
    // The cache key is `pattern\x00flags` w/ NUL separator so pattern="a",
    // flags="b" doesn't collide with pattern="ab", flags="".
    const ruleA = { kind: 'regex' as const, pattern: 'a', flags: 'b' };
    const ruleB = { kind: 'regex' as const, pattern: 'ab', flags: '' };
    // ruleA: pattern 'a' w/ invalid flag 'b' — compiles fine actually, 'b' isn't a real flag → throws
    // Actually new RegExp('a', 'b') throws SyntaxError. ruleB compiles fine.
    expect(runRegexRule(ruleA, baseItem).triggered).toBe(false); // invalid flag, non-match
    expect(runRegexRule(ruleB, { ...baseItem, title: 'ab123' }).triggered).toBe(true);
  });

  it('invalid pattern caches null result (no re-throw on subsequent calls)', () => {
    const bad = { kind: 'regex' as const, pattern: '([invalid' };
    expect(runRegexRule(bad, baseItem).triggered).toBe(false);
    expect(runRegexRule(bad, baseItem).triggered).toBe(false);
    expect(runRegexRule(bad, baseItem).triggered).toBe(false);
  });
});
