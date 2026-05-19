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
const HEX_LEN = (BITS * BITS) / 4; // 64 hex chars

/**
 * AE Polish #94: type-design-analyzer #4 — branded BlockHash type.
 * The string returned by `computeBlockhash` is shaped (`64-char hex`)
 * and `findSimilar` (in imageHashStore.ts) compares against this
 * shape via `entry.hash.length !== candidateHash.length`. Pre-Polish,
 * any `string` could be passed as a hash — the length-mismatch was
 * the only runtime guard. Branding `BlockHash` as a nominal type
 * lets `findSimilar` accept only values produced via this module's
 * `computeBlockhash` (or explicitly re-asserted via `asBlockHash`),
 * making the length check a documented invariant rather than a
 * runtime fence.
 */
export type BlockHash = string & { readonly __blockHash: unique symbol };

/**
 * Construct a BlockHash from a string. Throws if the input doesn't
 * match the 64-hex-char shape — use at the trust boundary (Redis
 * read path) where the producer is opaque.
 */
export function asBlockHash(raw: string): BlockHash {
  if (raw.length !== HEX_LEN || !/^[0-9a-fA-F]+$/.test(raw)) {
    throw new Error(
      `BlockHash shape invalid: expected ${HEX_LEN} hex chars, got ${raw.length} chars (sample: ${raw.slice(0, 16)}...)`
    );
  }
  return raw as BlockHash;
}

/**
 * Compute the 256-bit perceptual blockhash of an RGBA frame.
 * Returns a 64-character hex string (256 bits / 4 bits per hex char).
 */
export function computeBlockhash(frame: DecodedFrame): BlockHash {
  const raw = bmvbhash(
    {
      width: frame.width,
      height: frame.height,
      data: frame.rgba,
    },
    BITS
  );
  // bmvbhash's contract is "64 hex chars for BITS=16" — assert as a
  // safety net in case a future upstream change shifts the format.
  return asBlockHash(raw);
}

/**
 * Hamming distance between two 64-hex-char blockhashes. Returns the count
 * of bits that differ (0 = identical, 256 = inverse). Stable comparison
 * function for the lookup loop in imageHashStore.findSimilar.
 *
 * Why not Buffer.compare or XOR-on-bigint: 256-bit BigInt XOR works but is
 * 4-8x slower than per-nibble XOR + popcount on the hot path. Keeping the
 * loop tight matters because findSimilar does ≤500 comparisons per event.
 *
 * Accepts the branded `BlockHash` type — callers must construct via
 * `computeBlockhash` or assert via `asBlockHash` at the trust boundary.
 */
export function hammingDistance(a: BlockHash, b: BlockHash): number {
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
