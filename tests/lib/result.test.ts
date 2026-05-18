/**
 * AC — Result<T,E> helpers contract.
 */

import { describe, it, expect } from 'vitest';
import {
  ok,
  err,
  mapErr,
  mapOk,
  chain,
  unwrapOr,
  unwrap,
  isOk,
  isErr,
  type Result,
} from '../../src/lib/result';

describe('Result<T,E> (AC)', () => {
  it('ok constructs success variant', () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });

  it('err constructs failure variant', () => {
    const r = err('nope');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('nope');
  });

  it('mapErr transforms error w/o touching success', () => {
    const r = mapErr(ok(7), (e: string) => e.toUpperCase());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(7);
    const e2 = mapErr(err('bad'), (s: string) => s.toUpperCase());
    expect(e2.ok).toBe(false);
    if (!e2.ok) expect(e2.error).toBe('BAD');
  });

  it('mapOk transforms success w/o touching error', () => {
    const r = mapOk(ok(3), (n) => n * 2);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(6);
    const e2: Result<number, string> = err('boom');
    expect(mapOk(e2, (n) => n * 2)).toEqual(e2);
  });

  it('chain sequences success; short-circuits on error', () => {
    const r1 = chain(ok(5), (n) => ok(n + 1));
    expect(unwrapOr(r1, 0)).toBe(6);
    const r2 = chain(ok(5), (n) => (n > 0 ? err('big') : ok(n)));
    expect(r2.ok).toBe(false);
    const r3 = chain<number, number, string>(err('start'), (n) => ok(n + 1));
    expect(r3.ok).toBe(false);
    if (!r3.ok) expect(r3.error).toBe('start');
  });

  it('unwrapOr returns value or fallback', () => {
    expect(unwrapOr(ok(99), 0)).toBe(99);
    expect(unwrapOr(err('x') as Result<number, string>, 42)).toBe(42);
  });

  it('unwrap throws on err', () => {
    expect(() => unwrap(err('boom') as Result<number, string>)).toThrow('boom');
    expect(unwrap(ok(7))).toBe(7);
  });

  it('isOk + isErr type-guard for array filters', () => {
    const xs: Result<number, string>[] = [ok(1), err('a'), ok(2), err('b')];
    const goods = xs.filter(isOk).map((r) => r.value);
    const bads = xs.filter(isErr).map((r) => r.error);
    expect(goods).toEqual([1, 2]);
    expect(bads).toEqual(['a', 'b']);
  });
});
