import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  simulateRule,
  formatSimulationToast,
  type SimulationSample,
} from '../../src/core/simulateRule';
import * as runRuleModule from '../../src/core/runRule';
import type { Item, Author } from '../../src/shared/types';

const DEFAULT_ITEM: Item = {
  id: 't3_a',
  title: '',
  body: '',
  url: '',
  author: 'user',
  age: 0,
  score: 0,
  isSelf: false,
  over18: false,
  locked: false,
  stickied: false,
  approved: false,
  removed: false,
  spam: false,
  isLocked: false,
  isMod: false,
  isContributor: false,
  linkFlairText: null,
  flairText: null,
  flairCss: null,
};

const DEFAULT_AUTHOR: Author = {
  name: 'user',
  id: 't2_user',
  age: 86400 * 30,
  linkKarma: 100,
  commentKarma: 100,
  verified: true,
  isMod: false,
  isContributor: false,
  shadowBanned: false,
  flairText: null,
};

function sample(item: Partial<Item>, author?: Partial<Author>): SimulationSample {
  return {
    item: { ...DEFAULT_ITEM, ...item },
    author: { ...DEFAULT_AUTHOR, ...author },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('simulateRule', () => {
  it('rejects unparseable JSON5 input', async () => {
    const r = await simulateRule('not valid {', []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/parse failed/i);
  });

  it('parses a valid regex rule + reports zero fires against empty samples', async () => {
    const ruleJson5 = `{ kind: 'regex', name: 'r1', pattern: 'foo', target: 'title' }`;
    const r = await simulateRule(ruleJson5, []);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.totalSamples).toBe(0);
      expect(r.firedCount).toBe(0);
      expect(r.erroredCount).toBe(0);
    }
  });

  it('U1 happy-path — well-formed rule + sample reports zero errors', async () => {
    const ruleJson5 = `{ kind: 'regex', name: 'r1', pattern: 'valid-pattern', target: 'title' }`;
    const goodSample = sample({ id: 't3_a', title: 'valid-pattern matches' });
    const r = await simulateRule(ruleJson5, [goodSample]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.erroredCount).toBe(0);
      expect(r.firstError).toBeUndefined();
    }
  });

  it('W5 — runRule throws on every sample → erroredCount = N + firstError populated', async () => {
    // The W5 regression: previously named "U1 fix" but actually exercised the
    // happy path. Force runRule to throw to pin that simulateRule actually
    // surfaces per-sample errors (Codex CR3 BLOCKER #1 — mod sees "0/25 fired"
    // when every sample crashed, looks like the rule was safe).
    const spy = vi
      .spyOn(runRuleModule, 'runRule')
      .mockRejectedValue(new Error('regex backtrack limit exceeded'));
    const ruleJson5 = `{ kind: 'regex', name: 'r1', pattern: 'valid', target: 'title' }`;
    const samples = [sample({ id: 't3_a' }), sample({ id: 't3_b' }), sample({ id: 't3_c' })];
    const r = await simulateRule(ruleJson5, samples);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.erroredCount).toBe(3);
      expect(r.firedCount).toBe(0);
      expect(r.firstError).toBe('regex backtrack limit exceeded');
      expect(r.breakdown.every((b) => b.errored)).toBe(true);
    }
    spy.mockRestore();
  });

  it('W5 — partial failures: some samples throw, others succeed', async () => {
    let call = 0;
    const spy = vi.spyOn(runRuleModule, 'runRule').mockImplementation(async () => {
      call++;
      if (call === 2) throw new Error('flaky regex');
      return { triggered: true, name: 'r1', kind: 'regex' };
    });
    const ruleJson5 = `{ kind: 'regex', name: 'r1', pattern: 'valid', target: 'title' }`;
    const samples = [sample({ id: 't3_a' }), sample({ id: 't3_b' }), sample({ id: 't3_c' })];
    const r = await simulateRule(ruleJson5, samples);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.erroredCount).toBe(1);
      expect(r.firedCount).toBe(2);
      expect(r.firstError).toBe('flaky regex');
      expect(r.breakdown[1]?.errored).toBe(true);
      expect(r.breakdown[0]?.triggered).toBe(true);
    }
    spy.mockRestore();
  });

  it('U1 fix — breakdown includes errored flag per sample', async () => {
    const ruleJson5 = `{ kind: 'regex', name: 'r1', pattern: 'foo', target: 'title' }`;
    const r = await simulateRule(ruleJson5, [sample({ id: 't3_x', title: 'foo' })]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.breakdown[0]?.errored).toBe(false);
      expect(r.breakdown[0]?.triggered).toBe(true);
    }
  });

  it('regex rule fires on matching titles only', async () => {
    const ruleJson5 = `{ kind: 'regex', name: 'r1', pattern: 'crypto', target: 'title' }`;
    const samples = [
      sample({ id: 't3_a', title: 'free crypto giveaway' }),
      sample({ id: 't3_b', title: 'normal post' }),
      sample({ id: 't3_c', title: 'crypto meets art' }),
    ];
    const r = await simulateRule(ruleJson5, samples);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.totalSamples).toBe(3);
      expect(r.firedCount).toBe(2);
      expect(r.breakdown.find((b) => b.activityId === 't3_a')?.triggered).toBe(true);
      expect(r.breakdown.find((b) => b.activityId === 't3_b')?.triggered).toBe(false);
    }
  });

  it('author rule fires on low-karma matches', async () => {
    const ruleJson5 = `{ kind: 'author', name: 'r1', filter: { linkKarmaMax: 10 } }`;
    const samples = [
      sample({ id: 't3_a' }, { linkKarma: 5 }),
      sample({ id: 't3_b' }, { linkKarma: 50 }),
      sample({ id: 't3_c' }, { linkKarma: 8 }),
    ];
    const r = await simulateRule(ruleJson5, samples);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.firedCount).toBe(2);
    }
  });
});

describe('formatSimulationToast', () => {
  it('renders zero-samples message', () => {
    const r = {
      ok: true as const,
      totalSamples: 0,
      firedCount: 0,
      erroredCount: 0,
      breakdown: [],
    };
    expect(formatSimulationToast(r)).toMatch(/No recent posts/i);
  });

  it('renders percent + sample ID list', () => {
    const r = {
      ok: true as const,
      totalSamples: 10,
      firedCount: 3,
      erroredCount: 0,
      breakdown: [
        { activityId: 't3_a', triggered: true, errored: false },
        { activityId: 't3_b', triggered: false, errored: false },
        { activityId: 't3_c', triggered: true, errored: false },
        { activityId: 't3_d', triggered: true, errored: false },
      ],
    };
    expect(formatSimulationToast(r)).toContain('3/10 (30%)');
    expect(formatSimulationToast(r)).toContain('t3_a');
  });

  it('clips sample list at 3', () => {
    const breakdown = Array.from({ length: 8 }, (_, i) => ({
      activityId: `t3_${i}`,
      triggered: true,
      errored: false,
    }));
    const r = {
      ok: true as const,
      totalSamples: 8,
      firedCount: 8,
      erroredCount: 0,
      breakdown,
    };
    const toast = formatSimulationToast(r);
    expect((toast.match(/t3_/g) ?? []).length).toBe(3);
  });

  it('U1 fix — surfaces erroredCount + firstError in toast (Codex CR3 BLOCKER)', () => {
    const r = {
      ok: true as const,
      totalSamples: 25,
      firedCount: 0,
      erroredCount: 25,
      firstError: 'regex backtrack limit exceeded',
      breakdown: [],
    };
    const toast = formatSimulationToast(r);
    expect(toast).toContain('⚠ 25 samples errored');
    expect(toast).toContain('regex backtrack limit');
  });

  it('truncates long error messages', () => {
    const r = { ok: false as const, error: 'x'.repeat(800) };
    const toast = formatSimulationToast(r);
    expect(toast.length).toBeLessThanOrEqual(400);
  });
});
