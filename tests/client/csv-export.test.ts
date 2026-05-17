import { describe, it, expect } from 'vitest';
import { eventsToCsv, actionMarker, csvFilename } from '../../src/client/lib/csv-export';
import type { EventRecord } from '../../src/client/lib/types';

const FIXTURE_TS = Date.UTC(2026, 4, 17, 1, 0, 0, 0); // 2026-05-17T01:00:00.000Z

const baseEvent: EventRecord = {
  ts: FIXTURE_TS,
  activityId: 't3_abc123',
  runName: 'spam-removal',
  checkName: 'crypto-giveaway',
  triggered: true,
  actions: [{ kind: 'remove', ok: true, status: 'ok' }],
};

describe('actionMarker', () => {
  it('returns no marker for status:ok', () => {
    expect(actionMarker('ok', true)).toBe('');
  });

  it('returns diamond marker for status:dry-run', () => {
    expect(actionMarker('dry-run', false)).toBe('◆');
  });

  it('returns prohibition marker for status:skipped-locked', () => {
    expect(actionMarker('skipped-locked', false)).toBe('⊘');
  });

  it('returns X marker for status:error', () => {
    expect(actionMarker('error', false)).toBe('✗');
  });

  it('back-compat: undefined status + ok:true → no marker', () => {
    expect(actionMarker(undefined, true)).toBe('');
  });

  it('back-compat: undefined status + ok:false → X marker', () => {
    expect(actionMarker(undefined, false)).toBe('✗');
  });
});

describe('eventsToCsv', () => {
  it('empty events array → header-only CSV', () => {
    const out = eventsToCsv([]);
    expect(out).toBe('ts,activityId,runName,checkName,actions,allOk');
  });

  it('renders ISO timestamp + escaped fields', () => {
    const out = eventsToCsv([baseEvent]);
    expect(out).toContain('"2026-05-17T01:00:00.000Z"');
    expect(out).toContain('"t3_abc123"');
    expect(out).toContain('"spam-removal"');
    expect(out).toContain('"true"');
  });

  it('quotes fields containing commas', () => {
    const event: EventRecord = {
      ...baseEvent,
      checkName: 'rule, with comma',
    };
    const out = eventsToCsv([event]);
    expect(out).toContain('"rule, with comma"');
  });

  it('escapes double-quotes via doubling', () => {
    const event: EventRecord = {
      ...baseEvent,
      checkName: 'rule "quoted"',
    };
    const out = eventsToCsv([event]);
    expect(out).toContain('"rule ""quoted"""');
  });

  it('renders dry-run action with diamond marker', () => {
    const event: EventRecord = {
      ...baseEvent,
      actions: [
        { kind: 'remove', ok: false, status: 'dry-run', wouldHaveCalled: 'reddit.remove(t3_abc123, true)' },
      ],
    };
    const out = eventsToCsv([event]);
    expect(out).toContain('remove◆(reddit.remove(t3_abc123, true))');
  });

  it('renders error action with X marker', () => {
    const event: EventRecord = {
      ...baseEvent,
      actions: [{ kind: 'ban', ok: false, status: 'error' }],
    };
    const out = eventsToCsv([event]);
    expect(out).toContain('ban✗');
  });

  it('renders skipped-locked action with prohibition marker', () => {
    const event: EventRecord = {
      ...baseEvent,
      actions: [{ kind: 'lock', ok: false, status: 'skipped-locked' }],
    };
    const out = eventsToCsv([event]);
    expect(out).toContain('lock⊘');
  });

  it('joins multiple actions per event with semicolons', () => {
    const event: EventRecord = {
      ...baseEvent,
      actions: [
        { kind: 'remove', ok: true, status: 'ok' },
        { kind: 'comment', ok: true, status: 'ok' },
        { kind: 'lock', ok: true, status: 'ok' },
      ],
    };
    const out = eventsToCsv([event]);
    expect(out).toContain('remove;comment;lock');
  });

  it('allOk false when any action failed', () => {
    const event: EventRecord = {
      ...baseEvent,
      actions: [
        { kind: 'remove', ok: true, status: 'ok' },
        { kind: 'comment', ok: false, status: 'error' },
      ],
    };
    const out = eventsToCsv([event]);
    expect(out).toContain('"false"');
  });

  it('produces one header row + N event rows', () => {
    const events: EventRecord[] = [baseEvent, baseEvent, baseEvent];
    const out = eventsToCsv(events);
    const lines = out.split('\n');
    expect(lines).toHaveLength(4);
  });
});

describe('csvFilename', () => {
  it('replaces unsafe filename chars in subreddit', () => {
    const out = csvFilename('test/sub with spaces', new Date('2026-05-17T01:00:00Z'));
    expect(out).toBe('contextmod-events-test_sub_with_spaces-2026-05-17T01-00.csv');
  });

  it('uses safe subreddit name unchanged', () => {
    const out = csvFilename('cm_devvit_test', new Date('2026-05-17T01:00:00Z'));
    expect(out).toBe('contextmod-events-cm_devvit_test-2026-05-17T01-00.csv');
  });
});
