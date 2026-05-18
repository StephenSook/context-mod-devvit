/**
 * Phase 4 Step 4.5 gate: RecentActivityRule per-sub threshold counts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const getAuthorHistoryMock = vi.fn();

vi.mock('../../src/state/authorHistory', () => ({
  getAuthorHistory: (...a: unknown[]) => getAuthorHistoryMock(...a),
}));

import { runRecentActivityRule } from '../../src/rules/recentActivity';
import type { RecentActivityRule } from '../../src/shared/types';

const histInSubs = (postSubs: string[], commentSubs: string[]) => ({
  username: 'alice',
  fetchedAtMs: 0,
  posts: postSubs.map((s, i) => ({
    id: `t3_${i}`, subredditName: s, url: '', domain: '', createdAtMs: 0,
  })),
  comments: commentSubs.map((s, i) => ({
    id: `t1_${i}`, subredditName: s, body: '', createdAtMs: 0,
  })),
});

beforeEach(() => {
  getAuthorHistoryMock.mockReset();
});

describe('runRecentActivityRule', () => {
  it('triggers when commentCount in target subs > threshold', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(histInSubs(
      [],
      ['spam', 'spam', 'spam', 'spam', 'spam', 'spam', 'spam', 'spam', 'spam', 'spam'],
    ));
    const rule: RecentActivityRule = {
      kind: 'recentActivity', subreddits: ['spam'], commentCountGt: 5,
    };
    expect((await runRecentActivityRule(rule, 'alice')).triggered).toBe(true);
  });

  it('does not trigger when count is at the boundary (Gt, not Ge)', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(histInSubs(
      [], ['spam', 'spam', 'spam', 'spam', 'spam'],
    ));
    const rule: RecentActivityRule = {
      kind: 'recentActivity', subreddits: ['spam'], commentCountGt: 5,
    };
    expect((await runRecentActivityRule(rule, 'alice')).triggered).toBe(false);
  });

  it('case-insensitive sub name match', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(histInSubs(
      [], ['SPAM', 'Spam', 'spam'],
    ));
    const rule: RecentActivityRule = {
      kind: 'recentActivity', subreddits: ['spam'], commentCountGt: 2,
    };
    expect((await runRecentActivityRule(rule, 'alice')).triggered).toBe(true);
  });

  it('multiple target subs sum together', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(histInSubs(
      [], ['spam', 'spam', 'badactor', 'badactor'],
    ));
    const rule: RecentActivityRule = {
      kind: 'recentActivity', subreddits: ['spam', 'badactor'], commentCountGt: 3,
    };
    expect((await runRecentActivityRule(rule, 'alice')).triggered).toBe(true);
  });

  it('ignores activity in non-target subs', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(histInSubs(
      [], ['askreddit', 'askreddit', 'askreddit', 'askreddit', 'askreddit'],
    ));
    const rule: RecentActivityRule = {
      kind: 'recentActivity', subreddits: ['spam'], commentCountGt: 0,
    };
    expect((await runRecentActivityRule(rule, 'alice')).triggered).toBe(false);
  });

  it('triggers on postCountGt independently of commentCount', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(histInSubs(
      ['spam', 'spam', 'spam'], [],
    ));
    const rule: RecentActivityRule = {
      kind: 'recentActivity', subreddits: ['spam'], postCountGt: 2,
    };
    expect((await runRecentActivityRule(rule, 'alice')).triggered).toBe(true);
  });

  it('no-ops on empty author name', async () => {
    const rule: RecentActivityRule = {
      kind: 'recentActivity', subreddits: ['spam'], commentCountGt: 1,
    };
    expect((await runRecentActivityRule(rule, '')).triggered).toBe(false);
    expect(getAuthorHistoryMock).not.toHaveBeenCalled();
  });

  it('no-ops on empty subreddits list', async () => {
    const rule: RecentActivityRule = {
      kind: 'recentActivity', subreddits: [], commentCountGt: 1,
    };
    expect((await runRecentActivityRule(rule, 'alice')).triggered).toBe(false);
    expect(getAuthorHistoryMock).not.toHaveBeenCalled();
  });
});
