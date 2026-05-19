/**
 * Polish #31 — demo-fixtures.ts contract tests.
 *
 * Demo data is judge-visible (every `?demo=1` URL serves it), so the shape
 * needs to be pinned: action chips, stat-card values, hourly sparkline
 * length. A regression that drops a field would silently break the
 * dashboard's render of fixtures + judges would see broken stat cards.
 *
 * Plus the M6 privacy invariant: NO real Reddit handles in fixtures
 * (already pinned in tests/routes/api-auth.test.ts but defense-in-depth
 * is fine — the obfuscation lives here, the API surface just exposes it).
 */

import { describe, it, expect } from 'vitest';
import { demoEvents, DEMO_STATS } from '../../src/lib/demo-fixtures';

describe('demoEvents (Polish #31)', () => {
  it('returns at least one triggered event for the dashboard demo render', () => {
    const events = demoEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.triggered)).toBe(true);
  });

  it('every event has required wire fields (ts, activityId, runName, checkName, triggered, actions)', () => {
    const events = demoEvents();
    for (const e of events) {
      expect(typeof e.ts).toBe('number');
      expect(e.ts).toBeGreaterThan(0);
      expect(typeof e.activityId).toBe('string');
      expect(e.activityId.length).toBeGreaterThan(0);
      expect(typeof e.runName).toBe('string');
      expect(typeof e.checkName).toBe('string');
      expect(typeof e.triggered).toBe('boolean');
      expect(Array.isArray(e.actions)).toBe(true);
    }
  });

  it('accepts a custom `now` for deterministic test snapshots', () => {
    const now = 1700000000000;
    const events = demoEvents(now);
    // Events should be anchored relative to the given now (all in the past).
    for (const e of events) {
      expect(e.ts).toBeLessThanOrEqual(now);
    }
  });

  it('Polish #31: falls back to Date.now() + logs on non-finite `now` (defensive)', () => {
    // Caller passing NaN/Infinity would propagate to Date() + render
    // "Invalid Date" silently — the guard in demoEvents catches it.
    const evNaN = demoEvents(Number.NaN);
    expect(evNaN.length).toBeGreaterThan(0);
    expect(evNaN.every((e) => Number.isFinite(e.ts))).toBe(true);

    const evInf = demoEvents(Number.POSITIVE_INFINITY);
    expect(evInf.length).toBeGreaterThan(0);
    expect(evInf.every((e) => Number.isFinite(e.ts))).toBe(true);
  });

  it('Polish #31: privacy invariant — no real Reddit handles in activityIds', () => {
    // M6 / Polish #9 — synthetic data only, no `CowSufficient3840` /
    // `vinhbin` leaks. Re-pinned here at the source since this is
    // where the obfuscation lives (api-auth.test.ts pins the wire side).
    const events = demoEvents();
    const allIds = events.map((e) => e.activityId);
    expect(allIds.every((id) => id.startsWith('t3_demo_') || id.startsWith('t1_demo_'))).toBe(true);
  });

  it('action kind enum is one of the 7 shipped kinds', () => {
    const VALID_KINDS = new Set([
      'remove',
      'approve',
      'lock',
      'comment',
      'report',
      'ban',
      'userFlair',
    ]);
    const events = demoEvents();
    for (const e of events) {
      for (const a of e.actions) {
        expect(VALID_KINDS.has(a.kind)).toBe(true);
      }
    }
  });
});

describe('DEMO_STATS (Polish #31)', () => {
  it('exposes all required stat-card fields w/ numeric counters', () => {
    expect(typeof DEMO_STATS.actionsToday).toBe('number');
    expect(typeof DEMO_STATS.timeSavedMin).toBe('number');
    expect(typeof DEMO_STATS.activeRules).toBe('number');
    expect(typeof DEMO_STATS.topRule).toBe('string');
    expect(Array.isArray(DEMO_STATS.hourlyActions24h)).toBe(true);
  });

  it('hourlyActions24h has exactly 24 entries (one per hour for the sparkline)', () => {
    expect(DEMO_STATS.hourlyActions24h).toHaveLength(24);
    for (const v of DEMO_STATS.hourlyActions24h) {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('Polish #31: DEMO_STATS is frozen — caller mutations cannot leak across requests', () => {
    // Devvit isolates can reuse module state across requests in the same
    // V8 isolate. If a client-side or server-side caller pushed to the
    // exported array, the next request would see the polluted state.
    // The Object.freeze + frozen array prevents that.
    expect(Object.isFrozen(DEMO_STATS)).toBe(true);
    expect(Object.isFrozen(DEMO_STATS.hourlyActions24h)).toBe(true);
    expect(() => {
      // In strict mode (vitest defaults), this should throw on frozen.
      (DEMO_STATS as { actionsToday: number }).actionsToday = 999;
    }).toThrow();
  });
});
