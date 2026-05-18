/**
 * Z2-X22 — property-based fuzz tests via fast-check. Probes invariants
 * across the full input space (bounded by arbitraries) instead of the
 * happy-path examples our hand-written tests use.
 *
 * Run as part of `npm test`. Each property runs 100 random samples by
 * default; counterexamples shrink to the minimal failing input.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { fnv1a64, actionId } from '../../src/lib/idem';
import { eventMatchesQuery } from '../../src/client/components/EventSearchInput';

describe('fnv1a64 fuzz properties (Z2-X22)', () => {
  it('always returns 16 hex chars regardless of input', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const hash = fnv1a64(s);
        expect(hash).toMatch(/^[0-9a-f]{16}$/);
      })
    );
  });

  it('deterministic — same input always produces same output', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(fnv1a64(s)).toBe(fnv1a64(s));
      })
    );
  });

  it('non-empty input never returns the empty-string sentinel', () => {
    const empty = fnv1a64('');
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (s) => {
        expect(fnv1a64(s)).not.toBe(empty);
      })
    );
  });
});

describe('actionId fuzz properties (Z2-X22)', () => {
  it('any 3 strings produce a 16-hex output', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), fc.string(), (a, b, c) => {
        expect(actionId(a, b, c)).toMatch(/^[0-9a-f]{16}$/);
      })
    );
  });

  it('order-sensitive — swapping thingId/actionType changes the output', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (a, b) => {
          fc.pre(a !== b);
          expect(actionId(a, b, 'p')).not.toBe(actionId(b, a, 'p'));
        }
      )
    );
  });
});

describe('eventMatchesQuery fuzz properties (Z2-X22)', () => {
  const eventArb = fc.record({
    activityId: fc.string({ minLength: 1, maxLength: 20 }),
    runName: fc.option(fc.string({ maxLength: 20 }), { nil: undefined }),
    checkName: fc.option(fc.string({ maxLength: 20 }), { nil: undefined }),
    actions: fc.array(
      fc.record({ kind: fc.string({ minLength: 1, maxLength: 10 }) }),
      { maxLength: 5 }
    ),
  });

  it('empty + whitespace queries always match', () => {
    fc.assert(
      fc.property(eventArb, (event) => {
        expect(eventMatchesQuery(event, '')).toBe(true);
        expect(eventMatchesQuery(event, '   \t\n')).toBe(true);
      })
    );
  });

  it('matching the activityId always returns true', () => {
    fc.assert(
      fc.property(eventArb, (event) => {
        expect(eventMatchesQuery(event, event.activityId)).toBe(true);
      })
    );
  });

  it('query case is ignored', () => {
    fc.assert(
      fc.property(
        eventArb,
        fc.string({ minLength: 1, maxLength: 5 }),
        (event, q) => {
          const result = eventMatchesQuery(event, q);
          expect(eventMatchesQuery(event, q.toUpperCase())).toBe(result);
          expect(eventMatchesQuery(event, q.toLowerCase())).toBe(result);
        }
      )
    );
  });
});
