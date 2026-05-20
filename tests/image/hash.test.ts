/**
 * Phase 4.7 — blockhash + Hamming distance regression suite.
 *
 * blockhash-core integration is exercised via a synthetic 16x16 RGBA frame
 * (no real image decode in unit tests — that lives in the integration
 * scenario per Vinh's spike). The Hamming-distance util is the perf-
 * critical path so pin both the math + the bit-count loop.
 */

import { describe, it, expect } from 'vitest';
import { computeBlockhash, hammingDistance, asBlockHash, isBlockHash } from '../../src/image/hash';

function solidColorFrame(width: number, height: number, r: number, g: number, b: number) {
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = 255;
  }
  return { width, height, rgba };
}

describe('computeBlockhash', () => {
  it('returns 64-hex-char string (256 bits) for a 32x32 frame', () => {
    const hash = computeBlockhash(solidColorFrame(32, 32, 128, 128, 128));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('two identical frames produce identical hashes', () => {
    const a = computeBlockhash(solidColorFrame(64, 64, 200, 50, 50));
    const b = computeBlockhash(solidColorFrame(64, 64, 200, 50, 50));
    expect(a).toBe(b);
  });
});

describe('hammingDistance', () => {
  it('returns 0 for identical hashes', () => {
    const h = 'a'.repeat(64);
    expect(hammingDistance(h, h)).toBe(0);
  });

  it('returns 1 for one-bit difference', () => {
    // '0' = 0000, '1' = 0001 → 1 bit difference
    const a = '0'.repeat(64);
    const b = '0'.repeat(63) + '1';
    expect(hammingDistance(a, b)).toBe(1);
  });

  it('returns 4 for one full nibble difference (0 vs f)', () => {
    // '0' = 0000, 'f' = 1111 → 4 bits differ
    const a = '0'.repeat(64);
    const b = '0'.repeat(63) + 'f';
    expect(hammingDistance(a, b)).toBe(4);
  });

  it('returns 256 for full inverse (all 0 vs all f)', () => {
    const a = '0'.repeat(64);
    const b = 'f'.repeat(64);
    expect(hammingDistance(a, b)).toBe(256);
  });

  it('throws on length mismatch (defense against drift in hash format)', () => {
    // Polish #108: cast lands on BlockHash (the parameter type post-Polish-#94
    // brand) not bare string so the runtime contract matches what the type
    // system enforces at src/ callers. Test still exercises the runtime
    // length-mismatch throw — `'abc' / 'abcd'` are length 3/4 (not 64-hex),
    // which fail any caller validation before reaching this throw in
    // production, but the function itself accepts any string-typed input
    // at runtime since the brand is erased.
    expect(
      () =>
        hammingDistance(
          'abc' as unknown as import('../../src/image/hash').BlockHash,
          'abcd' as unknown as import('../../src/image/hash').BlockHash
        )
    ).toThrow(/length mismatch/);
  });
});

// AE Polish #102: cover the asBlockHash trust-boundary validator that
// Polish #94 introduced. pr-test-analyzer flagged: the validator's
// length-only AND charset-only throw paths are both uncovered. Without
// the charset guard, a corrupt 64-char NON-HEX entry (e.g. `'z'.repeat
// (64)`) would round-trip through isValidImageHashEntry's catch (the
// catch returns false, dropping the entry — that's correct), but a
// regression dropping the regex check while keeping the length check
// would silently re-admit non-hex bytes which parseInt('z', 16) reads
// as NaN downstream in hammingDistance.
describe('asBlockHash (Polish #94 trust-boundary validator)', () => {
  it('accepts a valid 64-hex-char string', () => {
    const raw = '0123456789abcdef'.repeat(4); // exactly 64 hex chars
    expect(() => asBlockHash(raw)).not.toThrow();
    expect(asBlockHash(raw)).toBe(raw);
  });

  it('accepts uppercase hex (case-insensitive)', () => {
    const raw = 'ABCDEF0123456789'.repeat(4);
    expect(() => asBlockHash(raw)).not.toThrow();
  });

  it('throws on length-too-short (63 chars)', () => {
    expect(() => asBlockHash('a'.repeat(63))).toThrow(/64 hex chars/);
  });

  it('throws on length-too-long (65 chars)', () => {
    expect(() => asBlockHash('a'.repeat(65))).toThrow(/64 hex chars/);
  });

  it('throws on empty string (length-zero edge case)', () => {
    expect(() => asBlockHash('')).toThrow(/64 hex chars/);
  });

  it('Polish #102 HIGH gap: throws on 64 NON-hex chars (charset check)', () => {
    // 64 z's — passes length check, fails regex. Pre-Polish-#102 had
    // no direct test for the charset-only failure path. Without this
    // guard, parseInt('z', 16) returns NaN inside hammingDistance and
    // produces silent wrong distances.
    expect(() => asBlockHash('z'.repeat(64))).toThrow(/64 hex chars/);
  });

  it('Polish #102 HIGH gap: throws on mixed hex+non-hex (single bad char)', () => {
    // 63 valid hex + 1 invalid → regex catches the single drift.
    const raw = '0'.repeat(63) + 'g';
    expect(() => asBlockHash(raw)).toThrow(/64 hex chars/);
  });
});

// AE Polish #107: gemini brutal-audit P2-1 cleanup. `isBlockHash` is
// the boolean predicate sibling of `asBlockHash` — same shape check,
// no try/catch cost. Used by isValidImageHashEntry inside findSimilar's
// hot loop (up to MAX_ENTRIES=500 per Redis read).
describe('isBlockHash (Polish #107 hot-path predicate)', () => {
  it('returns true for a valid 64-hex string', () => {
    expect(isBlockHash('0123456789abcdef'.repeat(4))).toBe(true);
  });

  it('returns true for uppercase hex (case-insensitive)', () => {
    expect(isBlockHash('ABCDEF0123456789'.repeat(4))).toBe(true);
  });

  it('returns false for length 63', () => {
    expect(isBlockHash('a'.repeat(63))).toBe(false);
  });

  it('returns false for length 65', () => {
    expect(isBlockHash('a'.repeat(65))).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isBlockHash('')).toBe(false);
  });

  it('returns false for 64 non-hex chars (charset check)', () => {
    expect(isBlockHash('z'.repeat(64))).toBe(false);
  });

  it('returns false for non-string inputs (number, null, undefined, object)', () => {
    expect(isBlockHash(123)).toBe(false);
    expect(isBlockHash(null)).toBe(false);
    expect(isBlockHash(undefined)).toBe(false);
    expect(isBlockHash({ hash: 'a'.repeat(64) })).toBe(false);
  });

  it('Polish #107 perf intent: predicate path matches asBlockHash decision (no behavior drift)', () => {
    // For every input, isBlockHash(x) === true must imply asBlockHash(x)
    // doesn't throw, and vice versa. Sample-tested across the matrix.
    const cases = [
      { input: 'a'.repeat(64), expected: true },
      { input: 'a'.repeat(63), expected: false },
      { input: 'z'.repeat(64), expected: false },
      { input: '', expected: false },
    ];
    for (const { input, expected } of cases) {
      expect(isBlockHash(input)).toBe(expected);
      // asBlockHash agreement: throws iff isBlockHash returns false.
      if (expected) {
        expect(() => asBlockHash(input)).not.toThrow();
      } else {
        expect(() => asBlockHash(input)).toThrow();
      }
    }
  });
});
