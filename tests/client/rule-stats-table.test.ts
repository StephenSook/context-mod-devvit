import { describe, it, expect } from 'vitest';
import { aggregateRuleStats } from '../../src/client/components/RuleStatsTable';
import type { EventRecord } from '../../src/client/lib/types';

function event(over: Partial<EventRecord>): EventRecord {
  return {
    ts: Date.now(),
    activityId: 't3_a',
    runName: 'spam',
    checkName: 'crypto',
    triggered: true,
    actions: [{ kind: 'remove', ok: true, status: 'ok' }],
    ...over,
  };
}

describe('aggregateRuleStats', () => {
  it('returns empty array for no events', () => {
    expect(aggregateRuleStats([])).toEqual([]);
  });

  it('skips events without runName or checkName', () => {
    expect(aggregateRuleStats([event({ runName: undefined })])).toEqual([]);
    expect(aggregateRuleStats([event({ checkName: undefined })])).toEqual([]);
  });

  it('groups events by run/check key', () => {
    const stats = aggregateRuleStats([
      event({ activityId: 't3_a' }),
      event({ activityId: 't3_b' }),
      event({ activityId: 't3_c', runName: 'other', checkName: 'low-karma' }),
    ]);
    expect(stats).toHaveLength(2);
    expect(stats[0]?.ruleKey).toBe('spam / crypto');
    expect(stats[0]?.count).toBe(2);
  });

  it('counts success / failed / dry-run separately', () => {
    const stats = aggregateRuleStats([
      event({
        activityId: '1',
        actions: [{ kind: 'remove', ok: true, status: 'ok' }],
      }),
      event({
        activityId: '2',
        actions: [{ kind: 'remove', ok: false, status: 'error' }],
      }),
      event({
        activityId: '3',
        actions: [{ kind: 'remove', ok: false, status: 'dry-run' }],
      }),
    ]);
    expect(stats[0]?.successCount).toBe(1);
    expect(stats[0]?.failedCount).toBe(1);
    expect(stats[0]?.dryRunCount).toBe(1);
  });

  it('sorts descending by count, then by lastFiredTs', () => {
    const stats = aggregateRuleStats([
      event({ activityId: '1', runName: 'r1', checkName: 'c1', ts: 100 }),
      event({ activityId: '2', runName: 'r2', checkName: 'c2', ts: 200 }),
      event({ activityId: '3', runName: 'r2', checkName: 'c2', ts: 300 }),
    ]);
    expect(stats[0]?.ruleKey).toBe('r2 / c2');
    expect(stats[0]?.count).toBe(2);
    expect(stats[0]?.lastFiredTs).toBe(300);
  });

  it('tracks lastFiredTs as max of event timestamps', () => {
    const stats = aggregateRuleStats([event({ ts: 100 }), event({ ts: 500 }), event({ ts: 200 })]);
    expect(stats[0]?.lastFiredTs).toBe(500);
  });
});
