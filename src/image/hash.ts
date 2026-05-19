/**
 * Phase 4.7 — perceptual blockhash via blockhash-core.
 *
 * 16-bit grid → 256-bit hash, encoded as 64 hex chars. Upstream CM uses the
 * same shape; threshold for "same image" is 5-8 bits out of 256. Vinh's 0.10
 * spike measured 0-2/256 bit drift between Reddit's preview.redd.it variants
 * and full-res originals → preview-path is loss-tolerant within threshold.
 */

import { bmvbhash } from 'blockhash-core';
import type { DecodedFrame } from './decode';

const BITS = 16; // 16x16 grid → 256-bit hash

/**
 * Compute the 256-bit perceptual blockhash of an RGBA frame.
 * Returns a 64-character hex string (256 bits / 4 bits per hex char).
 */
export function computeBlockhash(frame: DecodedFrame): string {
  return bmvbhash(
    {
      width: frame.width,
      height: frame.height,
      data: frame.rgba,
    },
    BITS
  );
}

/**
 * Hamming distance between two 64-hex-char blockhashes. Returns the count
 * of bits that differ (0 = identical, 256 = inverse). Stable comparison
 * function for the lookup loop in imageHashStore.findSimilar.
 *
 * Why not Buffer.compare or XOR-on-bigint: 256-bit BigInt XOR works but is
 * 4-8x slower than per-nibble XOR + popcount on the hot path. Keeping the
 * loop tight matters because findSimilar does ≤500 comparisons per event.
 */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) {
    throw new Error(`hammingDistance length mismatch: ${a.length} vs ${b.length}`);
  }
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16);
    // Brian Kernighan bit-count
    let v = xor;
    while (v) {
      v &= v - 1;
      dist += 1;
    }
  }
  return dist;
}
