/**
 * Step 3.6 — dryRunActivity pipeline tests.
 *
 * Non-contract sibling of handleActivity: same evaluation flow, force-true
 * dry-run on every action, returns structured DryRunResult, NEVER writes
 * to events:recent ZSET (test 2 pins this).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@devvit/web/server', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    zAdd: vi.fn(),
    zRemRangeByRank: vi.fn(),
  },
  reddit: {},
}));
vi.mock('../../src/state/recentEvents', () => ({
  recordEvent: vi.fn(),
}));
vi.mock('../../src/state/configStore');

import { dryRunActivity } from '../../src/core/dryRunActivity';
import * as configStore from '../../src/state/configStore';
import * as recentEvents from '../../src/state/recentEvents';
import type { Item, Author, AppConfig } from '../../src/shared/types';

const sub = 'r_test';
const item: Item = {
  id: 't3_abc',
  title: 'free crypto giveaway',
  body: '',
  url: '',
  author: 'spammer',
  age: 60,
  score: 0,
  isSelf: true,
  over18: false,
  removed: false,
  approved: false,
  locked: false,
  stickied: false,
  linkFlairText: null,
};
const author: Author = {
  name: 'spammer',
  id: 't2_x',
  age: 86400 * 30,
  linkKarma: 0,
  commentKarma: 0,
  flairText: null,
  isMod: false,
  isContributor: false,
  verified: false,
  shadowBanned: false,
};
const cfg: AppConfig = {
  dryRun: false,
  runs: [
    {
      name: 'spam-removal',
      checks: [
        {
          name: 'crypto-giveaway',
          combinator: 'OR',
          rules: [
            {
              kind: 'regex',
              name: 'scam-words',
              pattern: 'crypto|giveaway',
              flags: 'i',
            },
          ],
          actions: [
            { kind: 'remove', isSpam: true },
            {
              kind: 'comment',
              template: 'Hi {{author.nameSafe}}, removed as spam.',
            },
          ],
        },
      ],
    },
  ],
};

beforeEach(() => {
  vi.mocked(recentEvents.recordEvent).mockClear();
  vi.mocked(configStore.getCurrentRev).mockReset();
});

describe('dryRunActivity', () => {
  it('returns triggered runs with action wouldHaveCalled list', async () => {
    vi.mocked(configStore.getCurrentRev).mockResolvedValueOnce({
      rev: 1,
      config: cfg,
    });
    const result = await dryRunActivity(item, author, sub);
    expect(result.configPresent).toBe(true);
    expect(result.configRev).toBe(1);
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0]).toMatchObject({
      runName: 'spam-removal',
      triggered: true,
      checkName: 'crypto-giveaway',
    });
    expect(result.runs[0]!.actions).toEqual([
      { kind: 'remove', wouldHaveCalled: 'remove' },
      { kind: 'comment', wouldHaveCalled: 'comment' },
    ]);
  });

  it('NEVER writes to recentEvents ZSET (safety: pipeline is read-only)', async () => {
    vi.mocked(configStore.getCurrentRev).mockResolvedValueOnce({
      rev: 1,
      config: cfg,
    });
    await dryRunActivity(item, author, sub);
    expect(recentEvents.recordEvent).not.toHaveBeenCalled();
  });

  it('returns configPresent=false when no config published', async () => {
    vi.mocked(configStore.getCurrentRev).mockResolvedValueOnce(null);
    const result = await dryRunActivity(item, author, sub);
    expect(result).toEqual({ configPresent: false, runs: [] });
  });

  it('reports non-triggered runs explicitly so the form UI can show "no rules matched"', async () => {
    vi.mocked(configStore.getCurrentRev).mockResolvedValueOnce({
      rev: 1,
      config: cfg,
    });
    const peacefulItem: Item = {
      ...item,
      title: 'a peaceful poem about flowers',
    };
    const result = await dryRunActivity(peacefulItem, author, sub);
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0]).toMatchObject({
      runName: 'spam-removal',
      triggered: false,
    });
    expect(result.runs[0]!.actions).toEqual([]);
  });
});
