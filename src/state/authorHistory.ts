/**
 * Phase 4 — Author history cache (Plan Step 4.2).
 *
 * Shared substrate for HistoryRule, AttributionRule, RecentActivityRule. Each
 * rule needs the author's recent posts + comments, but they typically run
 * together on the same event — naive impl would fan out 3× to Reddit. Cache
 * the full listing payload for 1h, sub-scoped (per `K.authorHist`) so two
 * subs querying the same user can't last-writer-wins each other's slot.
 *
 * Storage: JSON blob in a single Redis key with TTL. Devvit Redis doesn't
 * expose Lua / hash-with-TTL primitives — JSON keeps the surface tiny and
 * matches the configStore pattern (Step 1.8).
 *
 * Fail-OPEN on Redis errors AND on Reddit-API errors. Same rationale as
 * repost rule: history-based rules are soft signals, not safety gates;
 * better to skip the rule than mass-flag during an outage.
 *
 * AE CRITICAL #5: distinguish 404-deleted-user (legit empty) from
 * 429/5xx-Reddit-degraded (empty arrays are LIES). The previous fail-open
 * swallowed both into `posts: []` + `comments: []`, which meant
 * `commentCountLt: 5` rules would fire false-positive on EVERY user during
 * a Reddit rate-limit outage — mass mis-moderation. Now sets a `degraded:
 * true` flag on the AuthorHistory shape that the three Phase 4 rules
 * consult; degraded reads SKIP rule evaluation (return triggered:false)
 * instead of trusting fake-zero counts. Degraded responses are NOT
 * cached so the next event will retry; legit-empty responses ARE cached
 * (no point hammering Reddit for a user with truly 0 posts).
 */

import { redis, reddit } from '@devvit/web/server';
import { K } from './keys';
import { acquireLock } from '../lib/idem';

const TTL_SECONDS = 60 * 60; // 1 hour
const FETCH_LIMIT = 100; // page once, no pagination loop
const SUB_DEFAULT = '_';

export interface AuthorHistoryPost {
  id: string;
  subredditName: string;
  url: string;
  domain: string; // host extracted from url
  createdAtMs: number;
}

export interface AuthorHistoryComment {
  id: string;
  subredditName: string;
  body: string;
  createdAtMs: number;
}

export interface AuthorHistory {
  username: string;
  fetchedAtMs: number;
  posts: AuthorHistoryPost[];
  comments: AuthorHistoryComment[];
  /**
   * AE CRITICAL #5: true when EITHER Reddit fetch threw (rate-limit,
   * 5xx, network blip) — the empty arrays do NOT reflect ground truth,
   * they reflect a Reddit-side failure. Phase 4 rules MUST consult this
   * flag and skip evaluation rather than trust the fake-zero counts.
   * False when both fetches succeeded (genuine empty arrays = the user
   * really has 0 posts/comments).
   */
  degraded: boolean;
}

const EMPTY_HISTORY = (username: string): AuthorHistory => ({
  username,
  fetchedAtMs: Date.now(),
  posts: [],
  comments: [],
  degraded: false,
});

// AE Polish #78: gemini brutal-audit P1-8. Previous cache-read path
// did a partial guard (`parsed.username === name`) but trusted `posts`,
// `comments`, `fetchedAtMs`, and `degraded` unchecked after the JSON
// parse. A poisoned blob (Redis FLUSHDB during a deploy, schema drift,
// partial write) with `posts: "not-an-array"` would propagate; downstream
// rules iterate posts/comments and throw on `.length` or `.filter`.
// Mirror the recentEvents/imageHashStore/modActivity validator pattern.
function isValidAuthorHistory(o: unknown, expectedName: string): o is AuthorHistory {
  if (!o || typeof o !== 'object') return false;
  const a = o as Record<string, unknown>;
  if (typeof a.username !== 'string' || a.username !== expectedName) return false;
  if (typeof a.fetchedAtMs !== 'number' || !Number.isFinite(a.fetchedAtMs)) return false;
  if (typeof a.degraded !== 'boolean') return false;
  if (!Array.isArray(a.posts)) return false;
  if (!Array.isArray(a.comments)) return false;
  return true;
}

/**
 * Best-effort extraction of the host portion of a URL. Returns '' on parse
 * failure so the AttributionRule can still match against the empty string
 * predictably (rather than crashing).
 */
function extractDomain(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Read the cached history for an author, or fetch + cache if missing/expired.
 * Sub-scoped via `K.authorHist`. Empty `name` short-circuits — deleted/removed
 * users surface as empty author payloads, no point hitting Reddit for them.
 */
export async function getAuthorHistory(
  name: string,
  sub: string = SUB_DEFAULT
): Promise<AuthorHistory> {
  if (!name) return EMPTY_HISTORY('');
  const key = K.authorHist(name, sub);

  // Cache check #1 (pre-lock).
  const cachedHit = await readCacheSafe(key, name);
  if (cachedHit) return cachedHit;

  // AE Polish #77: gemini brutal-audit P1-7 — per-author lock to prevent
  // cache-miss thundering herd. Without this, N concurrent events on the
  // same hot poster all miss cache, all hit Reddit's getPostsByUser +
  // getCommentsByUser endpoints, burning rate-limit budget. Reddit's
  // Devvit rate-limit cap is ~600 req/min per app — a viral 50-event
  // burst on one author could exhaust it. With the lock, the first event
  // fetches + caches; subsequent events in the same burst either see
  // the cache hit (when they arrive after the leader writes) or fall
  // through to a direct fetch (fail-open per the rule subsystem's posture).
  //
  // Lock scope: per (sub, author). Cross-sub queries on the same user
  // don't share the lock (their cache slots are isolated via K.authorHist).
  // TTL: acquireLock default 60s — comfortably longer than Reddit's
  // typical 500ms-2s fetch latency. Fail-OPEN on lock-acquire failure
  // (Redis blip OR another caller holds the lock — acquireLock returns
  // null in both cases). Direct fetch is the same as pre-fix behavior;
  // no regression for the lock-failed path.
  const release = await acquireLock(`authorhist:${name}`, sub);
  if (release) {
    try {
      return await fetchAndCache(name, key);
    } finally {
      await release();
    }
  }
  return await fetchAndCache(name, key);
}

// Polish #77 helper: extracted cache-read + cache-write paths so the
// double-checked-locking path doesn't duplicate the try/catch trees.
async function readCacheSafe(key: string, name: string): Promise<AuthorHistory | null> {
  try {
    const cached = await redis.get(key);
    if (!cached) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(cached);
    } catch {
      // Corrupt JSON — caller falls through to refetch (cache slot
      // will be overwritten on the next cache write).
      console.warn('[cm/authorHistory] cache JSON.parse failed — refetching:', name);
      // Polish #78: self-heal by deleting the bad slot so the next
      // read after refetch starts clean. Best-effort; failure here is
      // logged but doesn't change the rule path.
      try {
        await redis.del(key);
      } catch (delErr) {
        console.warn('[cm/authorHistory] cache del after parse-fail also failed:', name, delErr);
      }
      return null;
    }
    if (!isValidAuthorHistory(parsed, name)) {
      // Polish #78: shape mismatch (poisoned blob, schema drift,
      // partial write). Drop + log + self-heal.
      console.warn('[cm/authorHistory] cache shape mismatch — refetching:', name);
      try {
        await redis.del(key);
      } catch (delErr) {
        console.warn(
          '[cm/authorHistory] cache del after shape-mismatch also failed:',
          name,
          delErr
        );
      }
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('[cm/authorHistory] redis get failed — fetching fresh:', name, err);
  }
  return null;
}

async function fetchAndCache(name: string, key: string): Promise<AuthorHistory> {
  const fresh = await fetchFromReddit(name);

  // AE CRITICAL #5: NEVER cache a degraded response. The next event must
  // retry against a (hopefully recovered) Reddit; caching empty-because-
  // degraded would extend the false-positive window to the full 1h TTL.
  if (!fresh.degraded) {
    try {
      await redis.set(key, JSON.stringify(fresh), {
        expiration: new Date(Date.now() + TTL_SECONDS * 1000),
      });
    } catch (err) {
      console.warn('[cm/authorHistory] redis set failed — returning uncached:', name, err);
    }
  }

  return fresh;
}

async function fetchFromReddit(name: string): Promise<AuthorHistory> {
  const out: AuthorHistory = EMPTY_HISTORY(name);
  try {
    const postsListing = reddit.getPostsByUser({
      username: name,
      sort: 'new',
      limit: FETCH_LIMIT,
    });
    const posts = await postsListing.all();
    out.posts = posts.map((p) => ({
      id: p.id,
      subredditName: p.subredditName,
      url: p.url,
      domain: extractDomain(p.url),
      createdAtMs: p.createdAt instanceof Date ? p.createdAt.getTime() : Number(p.createdAt) || 0,
    }));
  } catch (err) {
    // AE CRITICAL #5: a throw means Reddit didn't tell us "0 posts" — it
    // told us nothing. Mark degraded so consumer rules skip evaluation.
    out.degraded = true;
    console.warn('[cm/authorHistory] getPostsByUser failed — empty posts (degraded):', name, err);
  }
  try {
    const commentsListing = reddit.getCommentsByUser({
      username: name,
      sort: 'new',
      limit: FETCH_LIMIT,
    });
    const comments = await commentsListing.all();
    out.comments = comments.map((c) => ({
      id: c.id,
      subredditName: c.subredditName,
      body: c.body,
      createdAtMs: c.createdAt instanceof Date ? c.createdAt.getTime() : Number(c.createdAt) || 0,
    }));
  } catch (err) {
    out.degraded = true;
    console.warn(
      '[cm/authorHistory] getCommentsByUser failed — empty comments (degraded):',
      name,
      err
    );
  }
  return out;
}
