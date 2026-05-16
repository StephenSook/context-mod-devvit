import { describe, it, expect } from 'vitest';
import { runRun } from '../../src/core/runRun';
import type { Item, Author, Run, Action } from '../../src/shared/types';

const baseItem: Item = {
  id: 't3_a', title: 'matches', body: '', url: '', author: 'u', age: 0, score: 0,
  isSelf: false, over18: false, removed: false, approved: false,
  locked: false, stickied: false, linkFlairText: null,
};

const baseAuthor: Author = {
  name: 'u', id: 't2_z', age: 0, linkKarma: 0, commentKarma: 0,
  flairText: null, isMod: false, isContributor: false, verified: false,
  shadowBanned: false,
};

const removeA: Action = { kind: 'remove' };
const approveA: Action = { kind: 'approve' };

describe('runRun', () => {
  it('linear: all checks trigger, actions collected in order', async () => {
    const run: Run = {
      name: 'r',
      checks: [
        { name: 'c1', combinator: 'AND', rules: [{ kind: 'regex', pattern: 'matches' }], actions: [removeA] },
        { name: 'c2', combinator: 'AND', rules: [{ kind: 'regex', pattern: 'matches' }], actions: [approveA] },
      ],
    };
    const res = await runRun(run, baseItem, baseAuthor);
    expect(res.triggered).toBe(true);
    expect(res.actions).toEqual([removeA, approveA]);
    expect(res.checkName).toBe('c1');
  });

  it('postBehavior: stop halts after first trigger', async () => {
    const run: Run = {
      name: 'r',
      checks: [
        {
          name: 'c1', combinator: 'AND',
          rules: [{ kind: 'regex', pattern: 'matches' }],
          actions: [removeA],
          postBehavior: 'stop',
        },
        { name: 'c2', combinator: 'AND', rules: [{ kind: 'regex', pattern: 'matches' }], actions: [approveA] },
      ],
    };
    const res = await runRun(run, baseItem, baseAuthor);
    expect(res.actions).toEqual([removeA]);
  });

  it('postBehavior: goto jumps to named check', async () => {
    const run: Run = {
      name: 'r',
      checks: [
        {
          name: 'c1', combinator: 'AND',
          rules: [{ kind: 'regex', pattern: 'matches' }],
          actions: [removeA],
          postBehavior: { goto: 'c3' },
        },
        { name: 'c2', combinator: 'AND', rules: [{ kind: 'regex', pattern: 'matches' }], actions: [approveA] },
        { name: 'c3', combinator: 'AND', rules: [{ kind: 'regex', pattern: 'matches' }], actions: [{ kind: 'lock' }] },
      ],
    };
    const res = await runRun(run, baseItem, baseAuthor);
    // c1 fires (remove), goto c3 (lock), c2 is skipped
    expect(res.actions.map((a) => a.kind)).toEqual(['remove', 'lock']);
  });

  it('goto to unknown name → bails out, returns collected', async () => {
    const run: Run = {
      name: 'r',
      checks: [
        {
          name: 'c1', combinator: 'AND',
          rules: [{ kind: 'regex', pattern: 'matches' }],
          actions: [removeA],
          postBehavior: { goto: 'does-not-exist' },
        },
      ],
    };
    const res = await runRun(run, baseItem, baseAuthor);
    expect(res.actions).toEqual([removeA]);
    expect(res.terminated).toBeUndefined();
  });

  it('100-iter limit terminates a circular goto', async () => {
    const run: Run = {
      name: 'loop',
      checks: [
        {
          name: 'c1', combinator: 'AND',
          rules: [{ kind: 'regex', pattern: 'matches' }],
          actions: [removeA],
          postBehavior: { goto: 'c2' },
        },
        {
          name: 'c2', combinator: 'AND',
          rules: [{ kind: 'regex', pattern: 'matches' }],
          actions: [approveA],
          postBehavior: { goto: 'c1' },
        },
      ],
    };
    const res = await runRun(run, baseItem, baseAuthor);
    expect(res.terminated).toBe('iteration-limit');
    expect(res.lastCheckName).toBeTruthy();
  });

  it('no checks trigger → triggered=false, no actions', async () => {
    const run: Run = {
      name: 'r',
      checks: [
        { name: 'c1', combinator: 'AND', rules: [{ kind: 'regex', pattern: 'never' }], actions: [removeA] },
      ],
    };
    const res = await runRun(run, baseItem, baseAuthor);
    expect(res.triggered).toBe(false);
    expect(res.actions).toEqual([]);
  });
});
