/**
 * Phase 4 Step 4.3 gate: HistoryRule reads author cache + karma off Author,
 * triggers on first satisfied threshold.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const getAuthorHistoryMock = vi.fn();

vi.mock('../../src/state/authorHistory', () => ({
  getAuthorHistory: (...a: unknown[]) => getAuthorHistoryMock(...a),
}));

import { runHistoryRule } from '../../src/rules/history';
import type { Author, HistoryRule } from '../../src/shared/types';

const author = (over: Partial<Author> = {}): Author => ({
  name: 'alice',
  id: 't2_a',
  age: 0,
  linkKarma: 100,
  commentKarma: 100,
  flairText: null,
  isMod: false,
  isContributor: false,
  verified: false,
  shadowBanned: false,
  ...over,
});

const hist = (posts: number, comments: number) => ({
  username: 'alice',
  fetchedAtMs: 0,
  posts: Array.from({ length: posts }, (_, i) => ({
    id: `t3_${i}`,
    subredditName: 's',
    url: '',
    domain: '',
    createdAtMs: 0,
  })),
  comments: Array.from({ length: comments }, (_, i) => ({
    id: `t1_${i}`,
    subredditName: 's',
    body: '',
    createdAtMs: 0,
  })),
});

beforeEach(() => {
  getAuthorHistoryMock.mockReset();
});

describe('runHistoryRule', () => {
  it('triggers on commentKarmaLt', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(hist(0, 0));
    const rule: HistoryRule = { kind: 'history', commentKarmaLt: 10 };
    expect((await runHistoryRule(rule, author({ commentKarma: 5 }))).triggered).toBe(true);
  });

  it('does not trigger when commentKarma at the boundary', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(hist(0, 0));
    const rule: HistoryRule = { kind: 'history', commentKarmaLt: 10 };
    expect((await runHistoryRule(rule, author({ commentKarma: 10 }))).triggered).toBe(false);
  });

  it('triggers on linkKarmaGt', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(hist(0, 0));
    const rule: HistoryRule = { kind: 'history', linkKarmaGt: 1_000_000 };
    expect((await runHistoryRule(rule, author({ linkKarma: 1_000_001 }))).triggered).toBe(true);
  });

  it('triggers on postCountGt against cached posts', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(hist(20, 0));
    const rule: HistoryRule = { kind: 'history', postCountGt: 10 };
    expect((await runHistoryRule(rule, author())).triggered).toBe(true);
  });

  it('triggers on commentCountLt — sparse-account signal', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(hist(0, 1));
    const rule: HistoryRule = { kind: 'history', commentCountLt: 5 };
    expect((await runHistoryRule(rule, author())).triggered).toBe(true);
  });

  it('no thresholds → never triggers (defensive default)', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(hist(100, 100));
    const rule: HistoryRule = { kind: 'history' };
    expect((await runHistoryRule(rule, author())).triggered).toBe(false);
  });

  it('passes sub through to the cache lookup', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(hist(0, 0));
    await runHistoryRule({ kind: 'history', commentKarmaLt: 1 }, author(), 'cm_test_sub');
    expect(getAuthorHistoryMock).toHaveBeenCalledWith('alice', 'cm_test_sub');
  });
});
