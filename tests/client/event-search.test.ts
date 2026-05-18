/**
 * Y2-X62 — event search predicate. Pins the substring match contract
 * across activityId / runName / checkName / action.kind.
 */

import { describe, it, expect } from 'vitest';
import { eventMatchesQuery } from '../../src/client/components/EventSearchInput';

const event = {
  activityId: 't3_crypto123',
  runName: 'spam-removal',
  checkName: 'crypto-giveaway',
  actions: [{ kind: 'remove' }, { kind: 'comment' }],
};

describe('eventMatchesQuery (Y2-X62)', () => {
  it('empty query matches everything', () => {
    expect(eventMatchesQuery(event, '')).toBe(true);
    expect(eventMatchesQuery(event, '   ')).toBe(true);
  });
  it('matches activityId substring', () => {
    expect(eventMatchesQuery(event, 'crypto123')).toBe(true);
    expect(eventMatchesQuery(event, 't3_')).toBe(true);
  });
  it('matches runName substring (case-insensitive)', () => {
    expect(eventMatchesQuery(event, 'SPAM-REMOVAL')).toBe(true);
    expect(eventMatchesQuery(event, 'removal')).toBe(true);
  });
  it('matches checkName substring', () => {
    expect(eventMatchesQuery(event, 'giveaway')).toBe(true);
  });
  it('matches action.kind in any action', () => {
    expect(eventMatchesQuery(event, 'remove')).toBe(true);
    expect(eventMatchesQuery(event, 'comment')).toBe(true);
  });
  it('returns false on no match', () => {
    expect(eventMatchesQuery(event, 'doesnotexist')).toBe(false);
  });
  it('handles missing runName / checkName gracefully', () => {
    const partial = { activityId: 't3_x', actions: [{ kind: 'ban' }] };
    expect(eventMatchesQuery(partial, 'ban')).toBe(true);
    expect(eventMatchesQuery(partial, 'crypto')).toBe(false);
  });
});
