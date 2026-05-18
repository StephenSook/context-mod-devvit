// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { filterMatches, type EventFilter } from '../../src/client/components/FilterChips';
import type { EventRecord } from '../../src/client/lib/types';

const baseEvent: EventRecord = {
  ts: Date.now(),
  activityId: 't3_abc',
  runName: 'spam',
  checkName: 'crypto',
  triggered: true,
  actions: [{ kind: 'remove', ok: true, status: 'ok' }],
};

describe('filterMatches', () => {
  it('all → matches every event', () => {
    expect(filterMatches(baseEvent, { kind: 'all' })).toBe(true);
  });

  it('action:remove → matches event w/ remove action', () => {
    expect(filterMatches(baseEvent, { kind: 'action', action: 'remove' })).toBe(true);
  });

  it('action:approve → does NOT match event w/ only remove', () => {
    expect(filterMatches(baseEvent, { kind: 'action', action: 'approve' })).toBe(false);
  });

  it('action:remove → matches when one of multiple actions is remove', () => {
    const event: EventRecord = {
      ...baseEvent,
      actions: [
        { kind: 'comment', ok: true, status: 'ok' },
        { kind: 'remove', ok: true, status: 'ok' },
      ],
    };
    expect(filterMatches(event, { kind: 'action', action: 'remove' })).toBe(true);
  });

  it('failed → matches event w/ any action ok:false', () => {
    const event: EventRecord = {
      ...baseEvent,
      actions: [
        { kind: 'remove', ok: true, status: 'ok' },
        { kind: 'ban', ok: false, status: 'error' },
      ],
    };
    expect(filterMatches(event, { kind: 'failed' })).toBe(true);
  });

  it('failed → does NOT match event w/ all actions ok:true', () => {
    expect(filterMatches(baseEvent, { kind: 'failed' })).toBe(false);
  });

  it('dry-run → matches event w/ any action status:dry-run', () => {
    const event: EventRecord = {
      ...baseEvent,
      actions: [{ kind: 'remove', ok: false, status: 'dry-run' }],
    };
    expect(filterMatches(event, { kind: 'dry-run' })).toBe(true);
  });

  it('dry-run → does NOT match event w/ only status:ok', () => {
    expect(filterMatches(baseEvent, { kind: 'dry-run' })).toBe(false);
  });
});
