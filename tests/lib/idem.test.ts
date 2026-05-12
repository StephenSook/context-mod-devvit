import { describe, it, expect } from 'vitest';
import { fnv1a64, actionId } from '../../src/lib/idem';

describe('fnv1a64 — canonical FNV-1a 64-bit test vectors', () => {
  // Universally-agreed FNV-1a 64 values, see en.wikipedia.org/wiki/FNV_hash_function
  it('empty string returns the offset basis', () => {
    expect(fnv1a64('')).toBe('cbf29ce484222325');
  });
  it('single char "a"', () => {
    expect(fnv1a64('a')).toBe('af63dc4c8601ec8c');
  });
  it('"foobar"', () => {
    expect(fnv1a64('foobar')).toBe('85944171f73967e8');
  });
  it('length 16 hex output regardless of input length', () => {
    expect(fnv1a64('lorem ipsum dolor sit amet')).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('actionId — deterministic composite', () => {
  it('same inputs produce same output', () => {
    expect(actionId('t3_abc', 'remove', 'spam=true'))
      .toBe(actionId('t3_abc', 'remove', 'spam=true'));
  });
  it('different inputs produce different outputs', () => {
    const a = actionId('t3_abc', 'remove', 'spam=true');
    const b = actionId('t3_abc', 'remove', 'spam=false');
    expect(a).not.toBe(b);
  });
  it('thingId change changes output', () => {
    const a = actionId('t3_abc', 'remove', '');
    const b = actionId('t3_def', 'remove', '');
    expect(a).not.toBe(b);
  });
  it('actionType change changes output', () => {
    const a = actionId('t3_abc', 'remove', '');
    const b = actionId('t3_abc', 'approve', '');
    expect(a).not.toBe(b);
  });
  it('returns 16 hex chars', () => {
    expect(actionId('x', 'y', 'z')).toMatch(/^[0-9a-f]{16}$/);
  });
});
