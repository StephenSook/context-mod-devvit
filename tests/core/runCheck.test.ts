import { describe, it, expect } from 'vitest';
import { runCheck } from '../../src/core/runCheck';
import type { Item, Author, Rule, Action } from '../../src/shared/types';

const baseItem: Item = {
  id: 't3_a',
  title: 'matches',
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
  age: 0,
  linkKarma: 0,
  commentKarma: 0,
  flairText: null,
  isMod: false,
  isContributor: false,
  verified: false,
  shadowBanned: false,
};

const ruleHit: Rule = { kind: 'regex', pattern: 'matches' };
const ruleMiss: Rule = { kind: 'regex', pattern: 'never' };
const removeAction: Action = { kind: 'remove' };

describe('runCheck', () => {
  it('AND with 2 hits → triggered, returns actions', async () => {
    const r = await runCheck(
      {
        name: 'c',
        combinator: 'AND',
        rules: [ruleHit, ruleHit],
        actions: [removeAction],
      },
      baseItem,
      baseAuthor
    );
    expect(r.triggered).toBe(true);
    expect(r.actions).toEqual([removeAction]);
  });

  it('OR with 1 hit + 1 miss → triggered', async () => {
    const r = await runCheck(
      {
        name: 'c',
        combinator: 'OR',
        rules: [ruleHit, ruleMiss],
      },
      baseItem,
      baseAuthor
    );
    expect(r.triggered).toBe(true);
  });

  it('enable:false → skipped, never triggers even with a matching rule', async () => {
    const r = await runCheck(
      { name: 'c', combinator: 'OR', enable: false, rules: [ruleHit], actions: [removeAction] },
      baseItem,
      baseAuthor
    );
    expect(r.triggered).toBe(false);
    expect(r.actions).toEqual([]);
  });

  it("kind:'comment' on a post item (t3_) → skipped", async () => {
    const r = await runCheck(
      { name: 'c', combinator: 'OR', kind: 'comment', rules: [ruleHit], actions: [removeAction] },
      baseItem, // id 't3_a' → a post
      baseAuthor
    );
    expect(r.triggered).toBe(false);
  });

  it("kind:'submission' on a post item (t3_) → runs normally", async () => {
    const r = await runCheck(
      { name: 'c', combinator: 'OR', kind: 'submission', rules: [ruleHit], actions: [removeAction] },
      baseItem,
      baseAuthor
    );
    expect(r.triggered).toBe(true);
  });

  it("kind:'comment' on a comment item (t1_) → runs normally", async () => {
    const r = await runCheck(
      { name: 'c', combinator: 'OR', kind: 'comment', rules: [ruleHit], actions: [removeAction] },
      { ...baseItem, id: 't1_b' },
      baseAuthor
    );
    expect(r.triggered).toBe(true);
  });

  it('filter mismatch → not triggered, no rules run', async () => {
    const r = await runCheck(
      {
        name: 'c',
        combinator: 'AND',
        filters: { itemIs: { over18: true } },
        rules: [ruleHit],
        actions: [removeAction],
      },
      baseItem,
      baseAuthor
    );
    expect(r.triggered).toBe(false);
    expect(r.actions).toEqual([]);
  });

  it('checkName is echoed back', async () => {
    const r = await runCheck(
      {
        name: 'block-scam',
        combinator: 'AND',
        rules: [ruleHit],
      },
      baseItem,
      baseAuthor
    );
    expect(r.checkName).toBe('block-scam');
  });

  it('empty rule list → not triggered', async () => {
    const r = await runCheck(
      {
        name: 'c',
        combinator: 'AND',
        rules: [],
      },
      baseItem,
      baseAuthor
    );
    expect(r.triggered).toBe(false);
  });
});
