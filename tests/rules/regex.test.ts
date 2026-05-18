import { describe, it, expect } from 'vitest';
import { runRegexRule } from '../../src/rules/regex';
import type { Item } from '../../src/shared/types';

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
