/**
 * Y1-X7 — stats aggregation contract. Pins counters, top-rules sort,
 * snapshot-vs-compute fallback, and stale-snapshot regeneration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const readRecentMock = vi.fn();
const store = new Map<string, string>();

vi.mock('@devvit/web/server', () => ({
  redis: {
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
      return 'OK';
    }),
  },
}));
vi.mock('../../src/state/recentEvents', () => ({
  readRecent: (...a: unknown[]) => readRecentMock(...a),
}));

import {
  computeStats,
  readStatsSnapshot,
  writeStatsSnapshot,
} from '../../src/state/statsRollup';

beforeEach(() => {
  store.clear();
  readRecentMock.mockReset();
});

function event(
  ts: number,
  runName: string,
  checkName: string,
  kind: string,
  ok = true
) {
  return {
    v: 1,
    nonce: 'n',
    ts,
    activityId: 't3_x',
    runName,
    checkName,
    triggered: true,
    actions: [{ kind, ok }],
  };
}

describe('computeStats (Y1-X7)', () => {
  it('counts lastHour + today + total accurately', async () => {
    const now = Date.now();
    readRecentMock.mockResolvedValue([
      event(now - 100, 'spam', 'crypto', 'remove'),
      event(now - 60_000, 'spam', 'crypto', 'remove'),
      event(now - 7_200_000, 'spam', 'low-karma', 'remove'),
      event(now - 90_000_000, 'spam', 'low-karma', 'remove'),
    ]);
    const stats = await computeStats('r_test');
    expect(stats.total).toBe(4);
    expect(stats.lastHour).toBe(2);
    expect(stats.today).toBe(3);
  });

  it('counts failed actions across all events', async () => {
    const now = Date.now();
    readRecentMock.mockResolvedValue([
      event(now, 'spam', 'crypto', 'remove', true),
      event(now, 'spam', 'crypto', 'remove', false),
      event(now, 'spam', 'low-karma', 'ban', false),
    ]);
    const stats = await computeStats('r_test');
    expect(stats.failedActions).toBe(2);
  });

  it('sorts topRules descending by count', async () => {
    const now = Date.now();
    readRecentMock.mockResolvedValue([
      event(now, 'spam', 'crypto', 'remove'),
      event(now, 'spam', 'crypto', 'remove'),
      event(now, 'spam', 'crypto', 'remove'),
      event(now, 'spam', 'low-karma', 'remove'),
      event(now, 'spam', 'low-karma', 'remove'),
      event(now, 'spam', 'banned-list', 'report'),
    ]);
    const stats = await computeStats('r_test');
    expect(stats.topRules[0]?.ruleKey).toBe('spam / crypto');
    expect(stats.topRules[0]?.count).toBe(3);
    expect(stats.topRules[1]?.ruleKey).toBe('spam / low-karma');
    expect(stats.topRules[1]?.count).toBe(2);
  });

  it('caps topRules at 5', async () => {
    const now = Date.now();
    readRecentMock.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) =>
        event(now, 'r', `check${i}`, 'remove')
      )
    );
    const stats = await computeStats('r_test');
    expect(stats.topRules.length).toBe(5);
  });
});

describe('writeStatsSnapshot + readStatsSnapshot (Y1-X7)', () => {
  it('writes snapshot to cm:stats:snapshot:{sub}', async () => {
    readRecentMock.mockResolvedValue([]);
    await writeStatsSnapshot('r_test');
    expect(store.get('cm:stats:snapshot:r_test')).toBeTruthy();
  });

  it('returns fresh snapshot when present + recent', async () => {
    const fresh: unknown = {
      total: 7,
      lastHour: 2,
      today: 5,
      failedActions: 0,
      topRules: [{ ruleKey: 'a/b', count: 3 }],
      computedAt: Date.now() - 60_000,
    };
    store.set('cm:stats:snapshot:r_test', JSON.stringify(fresh));
    readRecentMock.mockResolvedValue([]);
    const stats = await readStatsSnapshot('r_test');
    expect(stats.total).toBe(7);
    expect(stats.lastHour).toBe(2);
    expect(readRecentMock).not.toHaveBeenCalled();
  });

  it('recomputes when snapshot is stale (>1h)', async () => {
    const stale: unknown = {
      total: 99,
      lastHour: 99,
      today: 99,
      failedActions: 99,
      topRules: [],
      computedAt: Date.now() - 7_200_000,
    };
    store.set('cm:stats:snapshot:r_test', JSON.stringify(stale));
    readRecentMock.mockResolvedValue([event(Date.now(), 'r', 'c', 'remove')]);
    const stats = await readStatsSnapshot('r_test');
    expect(stats.total).toBe(1);
    expect(readRecentMock).toHaveBeenCalled();
  });

  it('falls through to compute when snapshot absent', async () => {
    readRecentMock.mockResolvedValue([event(Date.now(), 'r', 'c', 'remove')]);
    const stats = await readStatsSnapshot('r_test');
    expect(stats.total).toBe(1);
    expect(readRecentMock).toHaveBeenCalled();
  });
});
