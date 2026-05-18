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
 */

import { redis, reddit } from '@devvit/web/server';
import { K } from './keys';

const TTL_SECONDS = 60 * 60;        // 1 hour
const FETCH_LIMIT = 100;            // page once, no pagination loop
const SUB_DEFAULT = '_';

export interface AuthorHistoryPost {
  id: string;
  subredditName: string;
  url: string;
  domain: string;                   // host extracted from url
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
}

const EMPTY_HISTORY = (username: string): AuthorHistory => ({
  username,
  fetchedAtMs: Date.now(),
  posts: [],
  comments: [],
});

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
  sub: string = SUB_DEFAULT,
): Promise<AuthorHistory> {
  if (!name) return EMPTY_HISTORY('');
  const key = K.authorHist(name, sub);

  try {
    const cached = await redis.get(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as AuthorHistory;
        if (parsed && parsed.username === name) return parsed;
      } catch {
        // Corrupt cache entry — fall through to refetch.
      }
    }
  } catch (err) {
    console.warn('[cm/authorHistory] redis get failed — fetching fresh:', name, err);
  }

  const fresh = await fetchFromReddit(name);

  try {
    await redis.set(key, JSON.stringify(fresh), {
      expiration: new Date(Date.now() + TTL_SECONDS * 1000),
    });
  } catch (err) {
    console.warn('[cm/authorHistory] redis set failed — returning uncached:', name, err);
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
    console.warn('[cm/authorHistory] getPostsByUser failed — empty posts:', name, err);
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
    console.warn('[cm/authorHistory] getCommentsByUser failed — empty comments:', name, err);
  }
  return out;
}
