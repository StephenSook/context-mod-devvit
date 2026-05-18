import { describe, it, expect } from 'vitest';
import { runAuthorRule } from '../../src/rules/author';
import type { Item, Author } from '../../src/shared/types';

const baseItem: Item = {
  id: 't3_a',
  title: '',
  body: '',
  url: '',
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

const baseAuthor: Author = {
  name: 'u',
  id: 't2_z',
  age: 86_400,
  linkKarma: 5,
  commentKarma: 10,
  flairText: null,
  isMod: false,
  isContributor: false,
  verified: false,
  shadowBanned: false,
};

describe('runAuthorRule', () => {
  it('triggers when karma is below threshold', () => {
    const res = runAuthorRule(
      { kind: 'author', filter: { linkKarmaMax: 10 } },
      baseItem,
      baseAuthor
    );
    expect(res.triggered).toBe(true);
  });

  it('does not trigger when karma is above threshold', () => {
    const res = runAuthorRule(
      { kind: 'author', filter: { linkKarmaMin: 100 } },
      baseItem,
      baseAuthor
    );
    expect(res.triggered).toBe(false);
  });

  it('triggers on name match', () => {
    const res = runAuthorRule({ kind: 'author', filter: { nameIn: ['u'] } }, baseItem, baseAuthor);
    expect(res.triggered).toBe(true);
  });
});
