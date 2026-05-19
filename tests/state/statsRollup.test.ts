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
    // AE Polish #44: shape-stale fall-through now deletes the bad key.
    del: vi.fn(async (k: string) => {
      store.delete(k);
      return 1;
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
    //
    // AE Polish #71: pin system time so the test's `now` and
    // computeStats's internal Date.now() agree. Without this, slow CI
    // runners (Node 24 was the visible repro — Node 20/22 passed) read
    // a later Date.now() inside computeStats than the test captured,
    // bumping the bucket assignment down by 1 (e.g. a 5h-old event
    // landed in bucket 18 instead of 19 when CI added even ~1ms of
    // drift). Fake timers force determinism.
    vi.useFakeTimers();
    const now = new Date('2026-05-19T15:30:00Z').getTime();
    vi.setSystemTime(now);
    try {
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
    } finally {
      vi.useRealTimers();
    }
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

  it('Polish #43: event at exactly dayStart (24h ago) lands in bucket 0 (boundary fix)', async () => {
    // silent-failure-hunter Finding 2: pre-fix used `e.ts <= dayStart` which
    // EXCLUDED an event at exactly dayStart, but the bucket formula
    // Math.floor((0)/3600000) = 0 would have assigned it to bucket 0.
    // Bounds + assignment disagreed on the boundary. Fixed to `< dayStart`.
    //
    // AE Polish #71: same fake-timer pin as Polish #38 test above —
    // computeStats's internal Date.now() reads a later value than the
    // test's `Date.now()` on slow CI runners (Node 24 was the visible
    // repro). Without pinning, the event's ts ends up < computeStats's
    // dayStart by `delta`, gets EXCLUDED, bucket 0 count is 0 not 1.
    vi.useFakeTimers();
    const now = new Date('2026-05-19T15:30:00Z').getTime();
    vi.setSystemTime(now);
    try {
      const dayStart = now - 24 * 3_600_000;
      readRecentMock.mockResolvedValue([event(dayStart, 'r', 'c', 'remove')]);
      const stats = await computeStats('r_test');
      expect(stats.hourlyActions24h[0]).toBe(1);
      expect(stats.hourlyActions24h.reduce((a, b) => a + b, 0)).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('Polish #43: event at exactly now lands in last bucket (23) — upper edge inclusive', async () => {
    // Symmetry: the upper bound check is `> now`, so ts === now passes.
    // Math.floor((24h)/3_600_000) = 24, clamped to 23 via Math.min.
    const now = Date.now();
    readRecentMock.mockResolvedValue([event(now, 'r', 'c', 'remove')]);
    const stats = await computeStats('r_test');
    expect(stats.hourlyActions24h[23]).toBe(1);
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
      // AE Polish #40: must include client-shape fields or readStatsSnapshot
      // detects shape-stale + falls through to recompute (auto-heal path).
      actionsToday: 5,
      timeSavedMin: 20,
      activeRules: 1,
      topRule: 'a/b',
      hourlyActions24h: new Array(24).fill(0),
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

  it('Polish #44: shape-stale snapshot is DELETED on fall-through (defeats stale-cache poll spam)', async () => {
    // silent-failure-hunter Finding 4: without delete, every /api/stats poll
    // (~10s cadence) for the next ~1h would re-GET + re-parse the same
    // stale-shape snapshot + recompute, defeating the snapshot cache entirely.
    // Mirrors the Polish #6 parseErr branch which already does this.
    const stale = {
      total: 50,
      lastHour: 5,
      today: 10,
      failedActions: 2,
      topRules: [{ ruleKey: 'r/c', count: 5 }],
      computedAt: Date.now(),
      // NO hourlyActions24h — pre-Polish-#38 shape
    };
    store.set('cm:stats:snapshot:r_test', JSON.stringify(stale));
    readRecentMock.mockResolvedValue([]);
    await readStatsSnapshot('r_test');
    // The CRITICAL guarantee: key is GONE after the fall-through.
    expect(store.has('cm:stats:snapshot:r_test')).toBe(false);
  });

  it('Polish #40: pre-Polish-#38 snapshot (no hourlyActions24h) → falls through to recompute (auto-heal)', async () => {
    // Simulate a snapshot written BEFORE Polish #38 — has the old server
    // fields {total, lastHour, today, ...} but is missing the new
    // client-shape fields. Without Polish #40 backwards-compat, this would
    // happily return + the client would see hourlyActions24h:undefined
    // → fall back to ZERO_STATS → dashboard flatline. With Polish #40,
    // the shape check detects + falls through to a fresh compute that
    // produces the client-shape fields.
    const stale = {
      total: 50,
      lastHour: 5,
      today: 10,
      failedActions: 2,
      topRules: [{ ruleKey: 'spam-removal / crypto', count: 5 }],
      computedAt: Date.now(), // FRESH timestamp — would normally short-circuit
      // NO hourlyActions24h / actionsToday / etc.
    };
    store.set('cm:stats:snapshot:r_test', JSON.stringify(stale));
    readRecentMock.mockResolvedValue([
      event(Date.now() - 1000, 'spam-removal', 'crypto', 'remove'),
    ]);
    const stats = await readStatsSnapshot('r_test');
    // Recomputed — should now have the client-shape fields.
    expect(Array.isArray(stats.hourlyActions24h)).toBe(true);
    expect(stats.hourlyActions24h).toHaveLength(24);
    expect(stats.actionsToday).toBe(1);
    expect(readRecentMock).toHaveBeenCalled();
  });

  it('Polish #40: fresh-shape snapshot (has hourlyActions24h) is still returned within 1h window', async () => {
    // Sanity: don't break the cache-hit path for post-Polish-#38 snapshots.
    const fresh = {
      total: 50,
      lastHour: 5,
      today: 10,
      failedActions: 2,
      topRules: [{ ruleKey: 'spam-removal / crypto', count: 5 }],
      computedAt: Date.now(),
      actionsToday: 10,
      timeSavedMin: 40,
      activeRules: 1,
      topRule: 'spam-removal / crypto',
      hourlyActions24h: new Array(24).fill(0),
    };
    store.set('cm:stats:snapshot:r_test', JSON.stringify(fresh));
    readRecentMock.mockResolvedValue([]); // would compute to total:0 if mistakenly fell through
    const stats = await readStatsSnapshot('r_test');
    expect(stats.total).toBe(50); // cache hit, not recomputed
    expect(readRecentMock).not.toHaveBeenCalled();
  });
});
