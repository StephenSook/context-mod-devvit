/**
 * Task 2: getRecentSample — cached recent-post helper.
 *
 * Fetches the sub's N most recent posts via reddit.getNewPosts, normalizes
 * them to SimulationSample[], and caches the result in Redis for 60 s.
 *
 * Both the simulate-rule form handler (forms.ts) and the future live-impact
 * editor endpoint share this helper so neither re-fetches Reddit on every
 * keystroke; the 60 s TTL keeps the preview "fresh enough" while staying
 * well within Reddit API rate limits.
 *
 * The implementation mirrors the inline sample-building loop that previously
 * lived in forms.ts /simulate-rule-submit. Any change to the normalization
 * path must be reflected here to keep simulation and live-moderation
 * consistent.
 */

import { reddit, redis } from '@devvit/web/server';
import type { SimulationSample } from './simulateRule';
import { normalizePost, asPayloadTimestamp, type PostSubmitPayload } from '../shared/normalize';
import { getCurrentRev } from '../state/configStore';
import type { AppConfig } from '../shared/types';
import { log } from '../lib/log';

const SAMPLE_LIMIT = 25;
// 60 s: fresh enough for live preview, no per-keystroke Reddit fetch.
const CACHE_TTL_MS = 60_000;

function cacheKey(sub: string): string {
  return `cm:${sub}:recent-sample`;
}

interface RedditPostLike {
  id?: string;
  title?: string;
  body?: string;
  url?: string;
  authorId?: string;
  authorName?: string;
  score?: number;
  nsfw?: boolean;
  locked?: boolean;
  stickied?: boolean;
  createdAt?: number | Date | string;
}


/**
 * Recent posts of the sub, normalized to SimulationSample[], cached 60 s.
 *
 * On cache hit: returns the cached slice immediately (no Reddit call).
 * On cache miss: fetches via reddit.getNewPosts, normalizes, writes through to
 * Redis, returns the slice. Cache write failures are non-fatal (logged + ignored).
 *
 * Per-post normalize errors are also non-fatal: the offending post is skipped
 * and logged; the remaining samples are returned. This mirrors the same posture
 * the forms.ts simulate-rule handler uses for its per-post try/catch.
 */
export async function getRecentSample(sub: string): Promise<SimulationSample[]> {
  // Cache read.
  try {
    const cached = await redis.get(cacheKey(sub));
    if (cached != null) return JSON.parse(cached) as SimulationSample[];
  } catch {
    /* cache read miss/fail — fall through to fetch */
  }

  // Fetch current config for author-enrichment decision — same path as
  // the forms.ts simulate handler so normalization is consistent.
  const snapshot = await getCurrentRev(sub);
  const config: AppConfig = snapshot?.config ?? {
    runs: [],
    needsAuthorEnrichment: false,
  };

  // reddit.getNewPosts is not in the typed @devvit/web/server surface; cast
  // to avoid `ts(2339)`. This matches the same cast in forms.ts.
  const redditAny = reddit as unknown as {
    getNewPosts: (opts: {
      subredditName: string;
      limit: number;
      pageSize: number;
    }) => Promise<{ all: () => Promise<RedditPostLike[]> }> | { all: () => Promise<RedditPostLike[]> };
  };

  const listing = await redditAny.getNewPosts({
    subredditName: sub,
    limit: SAMPLE_LIMIT,
    pageSize: SAMPLE_LIMIT,
  });
  // I1: guard against a null/undefined listing before accessing .all.
  if (!listing || typeof listing.all !== 'function') return [];
  const allPosts = await listing.all();
  const recent = allPosts.slice(0, SAMPLE_LIMIT);

  const samples: SimulationSample[] = [];
  for (const post of recent) {
    try {
      const payload: PostSubmitPayload = {
        post: {
          id: post.id,
          title: post.title,
          selftext: post.body ?? '',
          url: post.url ?? '',
          authorId: post.authorId ?? '',
          score: post.score ?? 0,
          // I2: prefer the real isSelf field from the Reddit API; fall back to
          // URL heuristic only when the field is absent. The URL heuristic
          // diverges from the dry-run/test-rules path which reads isSelf directly.
          isSelf: typeof (post as { isSelf?: boolean }).isSelf === 'boolean'
            ? !!(post as { isSelf?: boolean }).isSelf
            : !!(post as { url?: string }).url?.includes(sub),
          nsfw: !!post.nsfw,
          locked: !!post.locked,
          stickied: !!post.stickied,
          createdAt: asPayloadTimestamp(post.createdAt),
        },
        author: { name: post.authorName ?? '', id: post.authorId ?? '' },
      } as PostSubmitPayload;
      const normalized = await normalizePost(payload, config);
      samples.push({ item: normalized.item, author: normalized.author });
    } catch (err) {
      log.warn('cm/core/getRecentSample', 'skipped sample', { err });
    }
  }

  // Cache write-through. Non-fatal: a Redis blip must not kill the sample
  // fetch path, only the caching benefit.
  try {
    await redis.set(cacheKey(sub), JSON.stringify(samples), {
      expiration: new Date(Date.now() + CACHE_TTL_MS),
    });
  } catch {
    /* cache write fail is non-fatal */
  }

  return samples;
}
