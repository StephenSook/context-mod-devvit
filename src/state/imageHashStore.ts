/**
 * Phase 4.7 — image-hash store for ImageRepostRule.
 *
 * Single JSON-list Redis key per sub holding the last N image-post hashes.
 * Read-modify-write semantics — Devvit Redis has no list-append primitive
 * usable from here. Cap 500 entries, 30d TTL refreshed on every write.
 *
 * Why JSON list instead of ZSET or per-hash key:
 *   - ZSET score has to fit in a double; 256-bit hash truncated to 53 bits
 *     loses too much fidelity to compare against the Hamming threshold.
 *   - Per-hash key (one Redis SET per post) means findSimilar can't enumerate
 *     without SCAN, which Devvit Redis doesn't expose.
 *   - JSON list is one GET + one SET per event — sub-second at 500 entries
 *     per Vinh's 0.10 spike. Replace w/ LSH band-index post-MVP if a busy
 *     sub pushes past ~1000 entries.
 *
 * Fail-OPEN on Redis error: image-repost is a soft signal (same posture as
 * authorHistory + URL-dedupe repost). A Redis outage that returned empty
 * would mass-flag if we matched against empty; we return "not similar"
 * instead so legit posts go through.
 */

import { redis } from '@devvit/web/server';
import { K } from './keys';
import { hammingDistance } from '../image/hash';

const MAX_ENTRIES = 500;
const DEFAULT_TTL_SEC = 30 * 86_400;
const SUB_DEFAULT = '_';

export interface ImageHashEntry {
  postId: string;
  hash: string; // 64-hex-char blockhash
  ts: number;
}

export interface SimilarMatch {
  entry: ImageHashEntry;
  distance: number;
}

// AE Polish #64: silent-failure-hunter HIGH finding — JSON.parse results
// in findSimilar + recordHash were cast to ImageHashEntry[] and then the
// `hash`/`postId`/`ts` fields were trusted unchecked. A corrupt member
// like `{postId: 123, hash: "...", ts: "yesterday"}` passed the existing
// `hash.length` guard at line 69 and propagated into match results and
// re-writes. Mirror the recentEvents.ts isValidRecentEventShape pattern:
// validate every field before trust. Bad entries are dropped silently;
// the store self-heals on next write.
function isValidImageHashEntry(e: unknown): e is ImageHashEntry {
  if (!e || typeof e !== 'object') return false;
  const o = e as Record<string, unknown>;
  if (typeof o.postId !== 'string' || o.postId.length === 0) return false;
  if (typeof o.hash !== 'string') return false;
  if (typeof o.ts !== 'number' || !Number.isFinite(o.ts)) return false;
  return true;
}

/**
 * Look up the closest hash in the store within `threshold` Hamming bits.
 * Returns null when nothing matches OR when the store is empty OR on
 * Redis failure (fail-OPEN — soft signal).
 *
 * Returns the FIRST match found (most-recent entry first since we prepend
 * on write) — for repost detection that's the correct semantics: callers
 * care that A duplicate exists, not which one is closest.
 */
export async function findSimilar(
  candidateHash: string,
  threshold: number,
  sub: string = SUB_DEFAULT
): Promise<SimilarMatch | null> {
  if (!candidateHash) return null;
  let entries: ImageHashEntry[];
  try {
    const raw = await redis.get(K.imgHashRecent(sub));
    if (!raw) return null;
    entries = JSON.parse(raw) as ImageHashEntry[];
    if (!Array.isArray(entries)) return null;
  } catch (err) {
    console.warn('[cm/imageHashStore/findSimilar] redis err — fail-open:', err);
    return null;
  }

  for (const entry of entries) {
    // Polish #64: full shape validation instead of just `hash.length`.
    // Filters out corrupt members so callers see only well-formed entries.
    if (!isValidImageHashEntry(entry)) continue;
    if (entry.hash.length !== candidateHash.length) continue;
    const distance = hammingDistance(candidateHash, entry.hash);
    if (distance <= threshold) {
      return { entry, distance };
    }
  }
  return null;
}

/**
 * Prepend a new entry. Trims to MAX_ENTRIES. Refreshes the 30d TTL on every
 * write so an active sub's store doesn't TTL-expire mid-week. Fail-OPEN:
 * a Redis error on write means the entry isn't stored — the next repost of
 * the same image won't trigger, but that's a soft fail consistent w/ the
 * rest of the image-repost subsystem.
 */
export async function recordHash(
  entry: ImageHashEntry,
  ttlSec: number = DEFAULT_TTL_SEC,
  sub: string = SUB_DEFAULT
): Promise<void> {
  if (!entry.hash || !entry.postId) return;
  try {
    const raw = await redis.get(K.imgHashRecent(sub));
    let existing: ImageHashEntry[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        // Polish #64: drop corrupt entries on every write so the store
        // self-heals — without this a poisoned entry persists forever
        // (write paths preserved the array via `.slice(0, MAX_ENTRIES)`).
        if (Array.isArray(parsed)) existing = parsed.filter(isValidImageHashEntry);
      } catch {
        // Corrupt JSON — start fresh.
      }
    }
    // Dedupe by postId so a re-trigger of the same post doesn't bloat the list.
    const filtered = existing.filter((e) => e.postId !== entry.postId);
    const next = [entry, ...filtered].slice(0, MAX_ENTRIES);
    await redis.set(K.imgHashRecent(sub), JSON.stringify(next), {
      expiration: new Date(Date.now() + ttlSec * 1000),
    });
  } catch (err) {
    console.warn('[cm/imageHashStore/recordHash] redis err — entry not stored:', err);
  }
}
