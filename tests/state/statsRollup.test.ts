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

import { computeStats, readStatsSnapshot, writeStatsSnapshot } from '../../src/state/statsRollup';

beforeEach(() => {
  store.clear();
  readRecentMock.mockReset();
});

function event(ts: number, runName: string, checkName: string, kind: string, ok = true) {
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
      Array.from({ length: 10 }, (_, i) => event(now, 'r', `check${i}`, 'remove'))
    );
    const stats = await computeStats('r_test');
    expect(stats.topRules.length).toBe(5);
  });

  it('Polish #38: emits client-shape fields (actionsToday/timeSavedMin/activeRules/topRule/hourlyActions24h)', async () => {
    // Pre-fix: server returned only {total/lastHour/today/...}, client
    // type expected {actionsToday/...}, client check on hourlyActions24h
    // treated every real response as empty → dashboard always rendered
    // ZERO_STATS. Test verifies the new client-shape fields land on the
    // wire alongside the legacy fields.
    const now = Date.now();
    readRecentMock.mockResolvedValue([
      event(now - 1000, 'spam-removal', 'crypto-giveaway', 'remove'),
      event(now - 1000 * 60 * 30, 'spam-removal', 'crypto-giveaway', 'remove'),
      event(now - 1000 * 60 * 60 * 5, 'low-karma-flag', 'fresh-account', 'report'),
    ]);
    const stats = await computeStats('r_test');
    expect(stats.actionsToday).toBe(3);
    expect(stats.timeSavedMin).toBe(12); // 3 * 4
    expect(stats.activeRules).toBe(2);
    expect(stats.topRule).toBe('spam-removal / crypto-giveaway');
    expect(Array.isArray(stats.hourlyActions24h)).toBe(true);
    expect(stats.hourlyActions24h).toHaveLength(24);
    expect(stats.hourlyActions24h[23]).toBe(2);
    // Event at `now - 5h` lands in bucket 19 (covers now-5h to now-4h).
    // bucket k covers [dayStart + k*1h, dayStart + (k+1)*1h); for k=19
    // that's [now-5h, now-4h], so a ts of exactly now-5h falls in bucket 19.
    expect(stats.hourlyActions24h[19]).toBe(1);
  });

  it('Polish #38: empty event ring still emits client-shape fields w/ safe defaults', async () => {
    readRecentMock.mockResolvedValue([]);
    const stats = await computeStats('r_test');
    expect(stats.actionsToday).toBe(0);
    expect(stats.timeSavedMin).toBe(0);
    expect(stats.activeRules).toBe(0);
    expect(stats.topRule).toBe('—');
    expect(stats.hourlyActions24h).toEqual(new Array(24).fill(0));
  });

  it('Polish #38: events outside 24h window don\'t contribute to hourlyActions24h', async () => {
    const now = Date.now();
    readRecentMock.mockResolvedValue([
      event(now - 25 * 3_600_000, 'r', 'c', 'remove'),
      event(now - 1000, 'r', 'c', 'remove'),
    ]);
    const stats = await computeStats('r_test');
    expect(stats.hourlyActions24h.reduce((a, b) => a + b, 0)).toBe(1);
    expect(stats.hourlyActions24h[23]).toBe(1);
    expect(stats.hourlyActions24h[0]).toBe(0);
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
