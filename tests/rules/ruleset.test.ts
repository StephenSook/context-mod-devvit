import { describe, it, expect } from 'vitest';
import { runRuleSet } from '../../src/rules/ruleset';
import type { Item, Author, Rule } from '../../src/shared/types';

const baseItem: Item = {
  id: 't3_a', title: 'matches A', body: '', url: '', author: 'u', age: 0, score: 0,
  isSelf: false, over18: false, removed: false, approved: false,
  locked: false, stickied: false, linkFlairText: null,
};

const baseAuthor: Author = {
  name: 'u', id: 't2_z', age: 0, linkKarma: 0, commentKarma: 0,
  flairText: null, isMod: false, isContributor: false, verified: false,
  shadowBanned: false,
};

const ruleHit:  Rule = { kind: 'regex', pattern: 'matches A' };
const ruleMiss: Rule = { kind: 'regex', pattern: 'never' };

describe('runRuleSet — AND combinator', () => {
  it('all hits → triggered=true', async () => {
    const r = await runRuleSet(
      { kind: 'ruleset', combinator: 'AND', rules: [ruleHit, ruleHit] },
      baseItem, baseAuthor,
    );
    expect(r.triggered).toBe(true);
  });
  it('one miss → triggered=false', async () => {
    const r = await runRuleSet(
      { kind: 'ruleset', combinator: 'AND', rules: [ruleHit, ruleMiss] },
      baseItem, baseAuthor,
    );
    expect(r.triggered).toBe(false);
  });
});

describe('runRuleSet — OR combinator', () => {
  it('one hit → triggered=true', async () => {
    const r = await runRuleSet(
      { kind: 'ruleset', combinator: 'OR', rules: [ruleMiss, ruleHit] },
      baseItem, baseAuthor,
    );
    expect(r.triggered).toBe(true);
  });
  it('all miss → triggered=false', async () => {
    const r = await runRuleSet(
      { kind: 'ruleset', combinator: 'OR', rules: [ruleMiss, ruleMiss] },
      baseItem, baseAuthor,
    );
    expect(r.triggered).toBe(false);
  });
});

describe('runRuleSet — empty', () => {
  it('empty ruleset → triggered=false (namedRules cycle break depends on this)', async () => {
    const r = await runRuleSet(
      { kind: 'ruleset', combinator: 'AND', rules: [] },
      baseItem, baseAuthor,
    );
    expect(r.triggered).toBe(false);
  });
});

describe('runRuleSet — nested', () => {
  it('AND( OR(miss, hit), hit ) → triggered=true', async () => {
    const r = await runRuleSet(
      {
        kind: 'ruleset', combinator: 'AND',
        rules: [
          { kind: 'ruleset', combinator: 'OR', rules: [ruleMiss, ruleHit] },
          ruleHit,
        ],
      },
      baseItem, baseAuthor,
    );
    expect(r.triggered).toBe(true);
  });
});
