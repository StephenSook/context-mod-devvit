import { describe, it, expect } from 'vitest';
import { passesFilters } from '../../src/core/filters';
import type { Item, Author } from '../../src/shared/types';

const baseItem: Item = {
  id: 't3_a',
  title: 'hi',
  body: '',
  url: 'https://example.com',
  author: 'u',
  age: 1000,
  score: 5,
  isSelf: false,
  over18: false,
  removed: false,
  approved: false,
  locked: false,
  stickied: false,
  linkFlairText: null,
};

const baseAuthor: Author = {
  name: 'u',
  id: 't2_z',
  age: 86400,
  linkKarma: 100,
  commentKarma: 200,
  flairText: null,
  isMod: false,
  isContributor: false,
  verified: false,
  shadowBanned: false,
};

describe('passesFilters — empty/null filter passes everything', () => {
  it('undefined filter spec returns true', () => {
    expect(passesFilters(undefined, baseItem, baseAuthor)).toBe(true);
  });
  it('empty filter spec returns true', () => {
    expect(passesFilters({}, baseItem, baseAuthor)).toBe(true);
  });
});

describe('Codex H5 — invalid filter regex MUST not throw (fail-CLOSED to false)', () => {
  // Mirrors runRegexRule's try/catch behavior — filter regexes were previously
  // raw `new RegExp(...).test(...)` which threw at runtime, killing the whole
  // handleActivity request for the bad-pattern config row. Codex flagged this
  // inconsistency: rule regex returns non-match, filter regex throws. Now both
  // return non-match (filter returns false, treated as filter-failed = skip).
  it('invalid titleMatches returns false instead of throwing', () => {
    expect(() =>
      passesFilters({ itemIs: { titleMatches: '([' } }, baseItem, baseAuthor)
    ).not.toThrow();
    expect(passesFilters({ itemIs: { titleMatches: '([' } }, baseItem, baseAuthor)).toBe(false);
  });
  it('invalid bodyMatches returns false instead of throwing', () => {
    expect(() =>
      passesFilters({ itemIs: { bodyMatches: '([' } }, baseItem, baseAuthor)
    ).not.toThrow();
    expect(passesFilters({ itemIs: { bodyMatches: '([' } }, baseItem, baseAuthor)).toBe(false);
  });
  it('invalid urlMatches returns false instead of throwing', () => {
    expect(() =>
      passesFilters({ itemIs: { urlMatches: '([' } }, baseItem, baseAuthor)
    ).not.toThrow();
    expect(passesFilters({ itemIs: { urlMatches: '([' } }, baseItem, baseAuthor)).toBe(false);
  });
  it('valid regex still functions normally', () => {
    expect(passesFilters({ itemIs: { titleMatches: '^hi$' } }, baseItem, baseAuthor)).toBe(true);
    expect(passesFilters({ itemIs: { titleMatches: '^bye$' } }, baseItem, baseAuthor)).toBe(false);
  });
});

describe('passesFilters — authorIs predicates', () => {
  it('nameIn positive', () => {
    expect(passesFilters({ authorIs: { nameIn: ['u'] } }, baseItem, baseAuthor)).toBe(true);
  });
  it('nameIn negative', () => {
    expect(passesFilters({ authorIs: { nameIn: ['other'] } }, baseItem, baseAuthor)).toBe(false);
  });
  it('nameNotIn negative (author is in the not-in list → reject)', () => {
    expect(passesFilters({ authorIs: { nameNotIn: ['u'] } }, baseItem, baseAuthor)).toBe(false);
  });
  it('ageMinSec — below min rejects', () => {
    expect(passesFilters({ authorIs: { ageMinSec: 1_000_000 } }, baseItem, baseAuthor)).toBe(false);
  });
  it('ageMinSec — at/above min passes', () => {
    expect(passesFilters({ authorIs: { ageMinSec: 86_400 } }, baseItem, baseAuthor)).toBe(true);
  });
  it('linkKarmaMax — over max rejects', () => {
    expect(passesFilters({ authorIs: { linkKarmaMax: 50 } }, baseItem, baseAuthor)).toBe(false);
  });
  it('commentKarmaMin — under min rejects', () => {
    expect(passesFilters({ authorIs: { commentKarmaMin: 500 } }, baseItem, baseAuthor)).toBe(false);
  });
  it('isMod predicate', () => {
    expect(passesFilters({ authorIs: { isMod: true } }, baseItem, baseAuthor)).toBe(false);
    expect(passesFilters({ authorIs: { isMod: false } }, baseItem, baseAuthor)).toBe(true);
  });
  it('flairTextIn rejects null author flair', () => {
    expect(passesFilters({ authorIs: { flairTextIn: ['VIP'] } }, baseItem, baseAuthor)).toBe(false);
  });
});

describe('passesFilters — itemIs predicates', () => {
  it('over18 positive', () => {
    expect(passesFilters({ itemIs: { over18: false } }, baseItem, baseAuthor)).toBe(true);
  });
  it('over18 negative', () => {
    expect(passesFilters({ itemIs: { over18: true } }, baseItem, baseAuthor)).toBe(false);
  });
  it('scoreMin — under min rejects', () => {
    expect(passesFilters({ itemIs: { scoreMin: 100 } }, baseItem, baseAuthor)).toBe(false);
  });
  it('scoreMax — over max rejects', () => {
    expect(passesFilters({ itemIs: { scoreMax: 1 } }, baseItem, baseAuthor)).toBe(false);
  });
  it('titleMatches regex positive', () => {
    expect(passesFilters({ itemIs: { titleMatches: '^hi' } }, baseItem, baseAuthor)).toBe(true);
  });
  it('titleMatches regex negative', () => {
    expect(passesFilters({ itemIs: { titleMatches: '^bye' } }, baseItem, baseAuthor)).toBe(false);
  });
  it('linkFlairTextIn rejects null link flair', () => {
    expect(passesFilters({ itemIs: { linkFlairTextIn: ['News'] } }, baseItem, baseAuthor)).toBe(
      false
    );
  });
});

describe('passesFilters — combined item + author', () => {
  it('both pass → true', () => {
    expect(
      passesFilters({ authorIs: { isMod: false }, itemIs: { over18: false } }, baseItem, baseAuthor)
    ).toBe(true);
  });
  it('author fails → false even when item passes', () => {
    expect(
      passesFilters({ authorIs: { isMod: true }, itemIs: { over18: false } }, baseItem, baseAuthor)
    ).toBe(false);
  });
});
