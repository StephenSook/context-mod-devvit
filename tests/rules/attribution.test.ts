/**
 * Phase 4 Step 4.4 gate: AttributionRule percent-of-domain match.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const getAuthorHistoryMock = vi.fn();

vi.mock('../../src/state/authorHistory', () => ({
  getAuthorHistory: (...a: unknown[]) => getAuthorHistoryMock(...a),
}));

import { runAttributionRule } from '../../src/rules/attribution';
import type { AttributionRule } from '../../src/shared/types';

const histWithDomains = (domains: string[]) => ({
  username: 'alice',
  fetchedAtMs: 0,
  posts: domains.map((d, i) => ({
    id: `t3_${i}`,
    subredditName: 's',
    url: `https://${d}/x`,
    domain: d,
    createdAtMs: 0,
  })),
  comments: [],
});

beforeEach(() => {
  getAuthorHistoryMock.mockReset();
});

describe('runAttributionRule', () => {
  it('triggers when 100% of posts match the domain', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(
      histWithDomains([
        'example.com',
        'example.com',
        'example.com',
        'example.com',
        'example.com',
      ])
    );
    const rule: AttributionRule = {
      kind: 'attribution',
      domains: ['example.com'],
      domainPercent: 100,
    };
    expect((await runAttributionRule(rule, 'alice')).triggered).toBe(true);
  });

  it('does not trigger when below the percent', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(
      histWithDomains([
        'example.com',
        'example.com',
        'other.com',
        'other.com',
        'other.com',
      ])
    );
    const rule: AttributionRule = {
      kind: 'attribution',
      domains: ['example.com'],
      domainPercent: 50,
    };
    expect((await runAttributionRule(rule, 'alice')).triggered).toBe(false);
  });

  it('substring + case-insensitive — www.youtube.com counts for "youtube.com"', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(
      histWithDomains([
        'www.YouTube.com',
        'm.youtube.com',
        'youtube.com',
        'reddit.com',
        'reddit.com',
      ])
    );
    const rule: AttributionRule = {
      kind: 'attribution',
      domains: ['youtube.com'],
      domainPercent: 50,
    };
    expect((await runAttributionRule(rule, 'alice')).triggered).toBe(true);
  });

  it('multiple domains — union match', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(
      histWithDomains([
        'youtube.com',
        'twitch.tv',
        'kick.com',
        'other.com',
        'other.com',
      ])
    );
    const rule: AttributionRule = {
      kind: 'attribution',
      domains: ['youtube.com', 'twitch.tv'],
      domainPercent: 40,
    };
    expect((await runAttributionRule(rule, 'alice')).triggered).toBe(true);
  });

  it('respects minPosts — 1/1 = 100% does not trigger under the floor', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(
      histWithDomains(['example.com'])
    );
    const rule: AttributionRule = {
      kind: 'attribution',
      domains: ['example.com'],
      domainPercent: 50,
    };
    expect((await runAttributionRule(rule, 'alice')).triggered).toBe(false);
  });

  it('honors a custom minPosts override', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(
      histWithDomains(['example.com', 'example.com'])
    );
    const rule: AttributionRule = {
      kind: 'attribution',
      domains: ['example.com'],
      domainPercent: 100,
      minPosts: 2,
    };
    expect((await runAttributionRule(rule, 'alice')).triggered).toBe(true);
  });

  it('no-ops on empty author name (no Reddit hit)', async () => {
    const rule: AttributionRule = {
      kind: 'attribution',
      domains: ['x.com'],
      domainPercent: 1,
    };
    expect((await runAttributionRule(rule, '')).triggered).toBe(false);
    expect(getAuthorHistoryMock).not.toHaveBeenCalled();
  });

  it('no-ops on empty domains list', async () => {
    const rule: AttributionRule = {
      kind: 'attribution',
      domains: [],
      domainPercent: 1,
    };
    expect((await runAttributionRule(rule, 'alice')).triggered).toBe(false);
    expect(getAuthorHistoryMock).not.toHaveBeenCalled();
  });

  it('ignores posts with empty domain (unparseable url)', async () => {
    getAuthorHistoryMock.mockResolvedValueOnce(
      histWithDomains(['', '', '', '', 'example.com'])
    );
    const rule: AttributionRule = {
      kind: 'attribution',
      domains: ['example.com'],
      domainPercent: 50,
    };
    expect((await runAttributionRule(rule, 'alice')).triggered).toBe(false);
  });
});
