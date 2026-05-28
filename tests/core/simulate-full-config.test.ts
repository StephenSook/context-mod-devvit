/**
 * Safety regression: simulateFullConfig MUST never fire real Reddit mutations.
 *
 * The structural guarantee lives in runAction: when bypassIdempotency=true the
 * function returns dry-run before the action-handler switch ever runs.
 * simulateFullConfig always passes bypassIdempotency=true AND forces dryRun=true
 * on the config, so the combined gate is redundant by design.
 *
 * This test locks that guarantee: a rule that DOES trigger (firedCount >= 1)
 * must leave every Reddit mutation spy uncalled. Without this regression test,
 * a future refactor that accidentally removes either gate would pass all
 * existing tests while silently allowing real removes / bans / comments during
 * Impact-tab previews.
 *
 * Reddit mutation spies asserted:
 *   Direct calls: remove, approve, submitComment, report, banUser, setUserFlair
 *   Indirect (via model object): getPostById(…).lock, getPostById(…).distinguish
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted: declarations run before vi.mock factory hoisting so spies can be
// referenced inside the factory closure without temporal-dead-zone errors.
const {
  spyRemove,
  spyApprove,
  spySubmitComment,
  spyReport,
  spyBanUser,
  spySetUserFlair,
  spyPostLock,
  spyPostDistinguish,
  spyCommentLock,
  spyCommentDistinguish,
  spyGetPostById,
  spyGetCommentById,
} = vi.hoisted(() => {
  const spyPostLock = vi.fn().mockResolvedValue(undefined);
  const spyPostDistinguish = vi.fn().mockResolvedValue(undefined);
  const spyCommentLock = vi.fn().mockResolvedValue(undefined);
  const spyCommentDistinguish = vi.fn().mockResolvedValue(undefined);

  const mockPost = { lock: spyPostLock, distinguish: spyPostDistinguish };
  const mockComment = { lock: spyCommentLock, distinguish: spyCommentDistinguish };

  return {
    spyRemove: vi.fn().mockResolvedValue(undefined),
    spyApprove: vi.fn().mockResolvedValue(undefined),
    spySubmitComment: vi.fn().mockResolvedValue(undefined),
    spyReport: vi.fn().mockResolvedValue(undefined),
    spyBanUser: vi.fn().mockResolvedValue(undefined),
    spySetUserFlair: vi.fn().mockResolvedValue(undefined),
    spyPostLock,
    spyPostDistinguish,
    spyCommentLock,
    spyCommentDistinguish,
    spyGetPostById: vi.fn().mockResolvedValue(mockPost),
    spyGetCommentById: vi.fn().mockResolvedValue(mockComment),
  };
});

vi.mock('@devvit/web/server', () => ({
  reddit: {
    remove: spyRemove,
    approve: spyApprove,
    submitComment: spySubmitComment,
    report: spyReport,
    banUser: spyBanUser,
    setUserFlair: spySetUserFlair,
    getPostById: spyGetPostById,
    getCommentById: spyGetCommentById,
  },
  redis: {
    // muteSet (isRuleMuted) reads from redis; return null so no rules are muted.
    hGet: vi.fn().mockResolvedValue(null),
    hGetAll: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(0),
    zAdd: vi.fn().mockResolvedValue(0),
    zRemRangeByRank: vi.fn().mockResolvedValue(0),
  },
}));

import { simulateFullConfig, type SimulationSample } from '../../src/core/simulateRule';
import type { Item, Author, AppConfig } from '../../src/shared/types';

// --- Shared fixtures (mirror pattern from simulate-rule.test.ts) ---

const ITEM: Item = {
  id: 't3_safety',
  title: 'buy cheap crypto now',
  body: 'unlimited free crypto giveaway click here',
  url: 'https://example.com',
  author: 'spammer99',
  age: 60,
  score: 1,
  isSelf: true,
  over18: false,
  removed: false,
  approved: false,
  locked: false,
  stickied: false,
  linkFlairText: null,
};

const AUTHOR: Author = {
  name: 'spammer99',
  id: 't2_spammer99',
  age: 86400 * 2,
  linkKarma: 0,
  commentKarma: 0,
  flairText: null,
  isMod: false,
  isContributor: false,
  verified: false,
  shadowBanned: false,
};

const SAMPLE: SimulationSample = { item: ITEM, author: AUTHOR };

/**
 * AppConfig whose rule WILL trigger on SAMPLE.
 * dryRun is intentionally NOT set here — the test proves that it is
 * simulateFullConfig's own forcing (not the config flag) that keeps
 * actions from executing.
 */
const CONFIG: AppConfig = {
  // No dryRun: true — absence proves simulateFullConfig's forcing is responsible.
  runs: [
    {
      name: 'spam-guard',
      checks: [
        {
          name: 'crypto-spam',
          combinator: 'OR',
          rules: [
            {
              kind: 'regex',
              name: 'crypto-keyword',
              pattern: 'crypto|giveaway',
              flags: 'i',
              target: 'title',
            },
          ],
          // Three action kinds cover remove, comment, and ban mutation paths.
          actions: [
            { kind: 'remove', isSpam: true },
            { kind: 'comment', template: 'Removed for spam.' },
            { kind: 'ban', reason: 'spam', duration: 3 },
          ],
        },
      ],
    },
  ],
};

const ALL_MUTATION_SPIES = [
  spyRemove,
  spyApprove,
  spySubmitComment,
  spyReport,
  spyBanUser,
  spySetUserFlair,
  spyPostLock,
  spyPostDistinguish,
  spyCommentLock,
  spyCommentDistinguish,
];

beforeEach(() => {
  ALL_MUTATION_SPIES.forEach((s) => s.mockClear());
});

describe('simulateFullConfig dry-run safety', () => {
  it('triggers the rule (firedCount >= 1) but fires ZERO Reddit mutations', async () => {
    const result = await simulateFullConfig(CONFIG, [SAMPLE], 'testsub');

    // 1. The call must succeed.
    expect(result.ok).toBe(true);

    if (!result.ok) return; // narrow for TS — line above already asserted

    // 2. The rule must have actually triggered — otherwise the "no mutations"
    //    assertion is vacuous (a rule that never triggered would trivially
    //    pass it even if the gate were broken).
    expect(result.firedCount).toBeGreaterThanOrEqual(1);
    expect(result.totalSamples).toBe(1);
    expect(result.erroredCount).toBe(0);

    // 3. Core safety assertion: every Reddit mutation spy is uncalled.
    //    If the dry-run early-return in runAction is ever removed or bypassed,
    //    one or more of these will flip to toHaveBeenCalled() and the test fails.
    expect(spyRemove).not.toHaveBeenCalled();
    expect(spyApprove).not.toHaveBeenCalled();
    expect(spySubmitComment).not.toHaveBeenCalled();
    expect(spyReport).not.toHaveBeenCalled();
    expect(spyBanUser).not.toHaveBeenCalled();
    expect(spySetUserFlair).not.toHaveBeenCalled();
    expect(spyPostLock).not.toHaveBeenCalled();
    expect(spyPostDistinguish).not.toHaveBeenCalled();
    expect(spyCommentLock).not.toHaveBeenCalled();
    expect(spyCommentDistinguish).not.toHaveBeenCalled();
  });

  it('scales to multiple samples — all trigger, still zero mutations', async () => {
    const samples: SimulationSample[] = [
      { item: { ...ITEM, id: 't3_s1', title: 'buy crypto now' }, author: AUTHOR },
      { item: { ...ITEM, id: 't3_s2', title: 'free giveaway crypto' }, author: AUTHOR },
      { item: { ...ITEM, id: 't3_s3', title: 'crypto millionaire secret' }, author: AUTHOR },
    ];

    const result = await simulateFullConfig(CONFIG, samples, 'testsub');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.firedCount).toBe(3);
    expect(result.erroredCount).toBe(0);

    ALL_MUTATION_SPIES.forEach((spy) => {
      expect(spy).not.toHaveBeenCalled();
    });
  });

  it('non-matching sample does not trigger and still fires zero mutations', async () => {
    const quietSample: SimulationSample = {
      item: { ...ITEM, id: 't3_quiet', title: 'a nice poem about flowers', body: 'lovely day' },
      author: AUTHOR,
    };

    const result = await simulateFullConfig(CONFIG, [quietSample], 'testsub');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.firedCount).toBe(0);
    expect(result.erroredCount).toBe(0);

    ALL_MUTATION_SPIES.forEach((spy) => {
      expect(spy).not.toHaveBeenCalled();
    });
  });

  it('mixed batch: some trigger, some do not, zero mutations throughout', async () => {
    const samples: SimulationSample[] = [
      { item: { ...ITEM, id: 't3_hit1', title: 'free crypto giveaway' }, author: AUTHOR },
      { item: { ...ITEM, id: 't3_miss1', title: 'my garden update' }, author: AUTHOR },
      { item: { ...ITEM, id: 't3_hit2', title: 'crypto pump incoming' }, author: AUTHOR },
    ];

    const result = await simulateFullConfig(CONFIG, samples, 'testsub');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.firedCount).toBe(2);
    expect(result.totalSamples).toBe(3);
    expect(result.erroredCount).toBe(0);

    ALL_MUTATION_SPIES.forEach((spy) => {
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
