/**
 * Phase 4.7 — ImageRepostRule.
 *
 * Triggers when a new image post's perceptual blockhash matches a
 * recently-seen hash in the per-sub store within `hammingThreshold` bits
 * (default 8 — within upstream CM's "same image" threshold).
 *
 * Pipeline:
 *   1. Skip non-image posts (item.imageUrl undefined → normalize.ts didn't
 *      find a preview variant + post.url isn't i.redd.it).
 *   2. fetchAndDecode → decode preview-variant pixels (pure JS).
 *   3. computeBlockhash → 256-bit perceptual hash.
 *   4. findSimilar against per-sub store w/ Hamming distance.
 *   5. If match → trigger + record (refresh TTL via overwrite). If no match
 *      → record the new hash + don't trigger.
 *
 * Fail-OPEN on every Reddit/decode/Redis error — image-repost is a soft
 * signal, not a safety gate (same posture as RepostRule + authorHistory).
 *
 * SRE non-negotiable (same as URL-dedupe RepostRule): ship behind
 * `config.dryRun: true` until mods watch the dry-run feed for a few days.
 * False positives nuke legitimate crossposts + weekly recurring image posts.
 */

import type { ImageRepostRule, Item, RuleResult } from '../shared/types';
import { fetchAndDecode } from '../image/decode';
import { computeBlockhash, type BlockHash } from '../image/hash';
import { findSimilar, recordHash, type SimilarMatch } from '../state/imageHashStore';
import { acquireLock } from '../lib/idem';

const DEFAULT_HAMMING_THRESHOLD = 8;
const DEFAULT_WINDOW_DAYS = 30;
const SUB_DEFAULT = '_';

export async function runImageRepostRule(
  rule: ImageRepostRule,
  item: Item,
  sub: string = SUB_DEFAULT
): Promise<RuleResult> {
  if (!item.imageUrl || !item.id) return { triggered: false };

  const decoded = await fetchAndDecode(item.imageUrl);
  if (!decoded.ok) {
    // Fail-OPEN: decode failure is a soft signal. Common cases:
    //   - URL returned WebP despite Accept header (Reddit edge)
    //   - Image > 6MB cap
    //   - preview.redd.it signature expired
    // None of these justify mass-flagging legit posts.
    console.warn(
      '[cm/rules/imageRepost] decode failed — fail-open (no trigger):',
      decoded.phase,
      decoded.error,
      item.id
    );
    return { triggered: false };
  }

  let candidateHash: BlockHash;
  try {
    candidateHash = computeBlockhash(decoded.frame);
  } catch (err) {
    console.warn(
      '[cm/rules/imageRepost] blockhash failed — fail-open:',
      item.id,
      err
    );
    return { triggered: false };
  }

  const threshold = rule.hammingThreshold ?? DEFAULT_HAMMING_THRESHOLD;
  const windowDays = rule.windowDays ?? DEFAULT_WINDOW_DAYS;
  const ttlSec = windowDays * 86_400;

  // Polish #26: defense-in-depth fail-OPEN around the storage calls.
  // imageHashStore's findSimilar + recordHash already catch + warn on Redis
  // throws (returning null / void), but matching the rule-level pattern
  // used by repost.ts + scheduler.ts's image-hash-worker keeps the
  // invariant explicit AT the rule layer: a Redis blip during evaluation
  // must NEVER abort the surrounding handleActivity loop (which would
  // skip every later run's rules + actions for the same event).
  //
  // AE Polish #61: per-sub lock around findSimilar+recordHash. codex-rescue
  // 4th-pass review caught a read-modify-write race: two simultaneous
  // duplicate-image posts both run findSimilar against the pre-write list
  // → both miss → both recordHash GET-SET the entire list, losing one
  // entry. Concurrent distinct posts can also drop a hash. The lock
  // serializes the critical section per sub. Fail-OPEN on lock failure
  // (acquireLock returns null on Redis blip) — same posture as the
  // surrounding storage calls. Lock TTL is 60s (acquireLock default) but
  // we release immediately after recordHash in the finally; the only
  // tail-latency risk is if the rule somehow hangs after acquireLock
  // (Polish #42 caps the entire run at 10s, so worst case the lock
  // expires 50s after we'd naturally release).
  const release = await acquireLock(`imghash:${sub ?? '_'}`);
  let match: SimilarMatch | null = null;
  try {
    try {
      match = await findSimilar(candidateHash, threshold, sub);
    } catch (err) {
      console.warn(
        '[cm/rules/imageRepost] findSimilar threw — fail-open (no trigger):',
        item.id,
        err
      );
      return { triggered: false };
    }
    // Always record AFTER the lookup so the same post can't match itself.
    try {
      await recordHash(
        { postId: item.id, hash: candidateHash, ts: Date.now() },
        ttlSec,
        sub
      );
    } catch (err) {
      // Lookup already succeeded; honor its decision. Lost record means
      // future posts won't dedupe against THIS post, but won't false-positive.
      console.warn(
        '[cm/rules/imageRepost] recordHash threw — trigger decision still honored from lookup:',
        item.id,
        err
      );
    }
  } finally {
    if (release) await release();
  }

  if (match) {
    return { triggered: true };
  }
  return { triggered: false };
}
