/**
 * Phase 4.7 — blockhash + Hamming distance regression suite.
 *
 * blockhash-core integration is exercised via a synthetic 16x16 RGBA frame
 * (no real image decode in unit tests — that lives in the integration
 * scenario per Vinh's spike). The Hamming-distance util is the perf-
 * critical path so pin both the math + the bit-count loop.
 */

import { describe, it, expect } from 'vitest';
import { computeBlockhash, hammingDistance } from '../../src/image/hash';

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
    expect(() => hammingDistance('abc', 'abcd')).toThrow(/length mismatch/);
  });
});
