/**
 * Phase 4 Step 4.2 gate: sub-scoped author history cache.
 *   - first call: fetches via Reddit, writes JSON blob with TTL, returns enriched shape
 *   - second call within TTL: reads from cache, no Reddit hit
 *   - corrupt cache entry: refetch + overwrite
 *   - redis get error: fail-OPEN → fetch fresh from Reddit
 *   - Reddit fetch error: fail-OPEN → empty posts/comments
 *   - sub-scoping: same user in two subs writes two different keys
 *   - empty name: no Reddit hit, returns empty history
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const redisGet = vi.fn();
const redisSet = vi.fn().mockResolvedValue('OK');
const redisDel = vi.fn().mockResolvedValue(1);
const getPostsByUser = vi.fn();
const getCommentsByUser = vi.fn();

vi.mock('@devvit/web/server', () => ({
  redis: {
    get: (...a: unknown[]) => redisGet(...a),
    set: (...a: unknown[]) => redisSet(...a),
    del: (...a: unknown[]) => redisDel(...a),
  },
  reddit: {
    getPostsByUser: (...a: unknown[]) => getPostsByUser(...a),
    getCommentsByUser: (...a: unknown[]) => getCommentsByUser(...a),
  },
}));

// AE Polish #77: mock acquireLock so existing redis.set/get assertions
// only count cache-related calls (not the lock NX-set + release del-
// verify pair). Default: always-succeed lock + no-op release. Individual
// tests can override per-case.
const acquireLockMock = vi.fn();
vi.mock('../../src/lib/idem', () => ({
  acquireLock: (...a: unknown[]) => acquireLockMock(...a),
}));

import { getAuthorHistory } from '../../src/state/authorHistory';

const stubListing = <T>(items: T[]) => ({ all: () => Promise.resolve(items) });

const post = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 't3_p1',
  subredditName: 'subA',
  url: 'https://example.com/a',
  createdAt: new Date('2026-05-15T00:00:00Z'),
  ...over,
});
const comment = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 't1_c1',
  subredditName: 'subA',
  body: 'hello',
  createdAt: new Date('2026-05-15T00:00:00Z'),
  ...over,
});

beforeEach(() => {
  redisGet.mockReset();
  redisSet.mockClear();
  redisSet.mockResolvedValue('OK');
  redisDel.mockClear();
  redisDel.mockResolvedValue(1);
  getPostsByUser.mockReset();
  getCommentsByUser.mockReset();
  // Default: lock acquires successfully + release is a no-op. Tests can
  // override (e.g. mockResolvedValueOnce(null)) to assert fail-open
  // behavior when lock acquisition fails.
  acquireLockMock.mockReset();
  acquireLockMock.mockResolvedValue(async () => {});
});

describe('getAuthorHistory', () => {
  it('on first call fetches from Reddit, writes JSON with TTL, returns enriched shape', async () => {
    redisGet.mockResolvedValueOnce(null);
    getPostsByUser.mockReturnValueOnce(
      stubListing([
        post({ url: 'https://Example.COM/path?q=1' }),
        post({ id: 't3_p2', url: 'not-a-url' }),
      ])
    );
    getCommentsByUser.mockReturnValueOnce(stubListing([comment()]));

    const h = await getAuthorHistory('alice', 'sub1');

    expect(h.username).toBe('alice');
    expect(h.posts).toHaveLength(2);
    expect(h.posts[0]!.domain).toBe('example.com'); // lowercased + extracted
    expect(h.posts[1]!.domain).toBe(''); // parse fail → ''
    expect(h.comments).toHaveLength(1);

    expect(redisSet).toHaveBeenCalledTimes(1);
    const [key, value, opts] = redisSet.mock.calls[0] as [string, string, { expiration: Date }];
    expect(key).toBe('cm:sub1:author:hist:alice');
    expect(JSON.parse(value).username).toBe('alice');
    expect(opts.expiration.getTime()).toBeGreaterThan(Date.now());
  });

  it('on cache hit, returns parsed value without calling Reddit', async () => {
    // Polish #78: cache fixture must include `degraded: false` to pass
    // the new isValidAuthorHistory shape validator — pre-fix the AE
    // CRITICAL #5 `degraded` field had been added but the old read
    // path only checked `parsed.username === name`.
    const cached = {
      username: 'alice',
      fetchedAtMs: Date.now() - 1000,
      posts: [
        {
          id: 't3_p9',
          subredditName: 'subA',
          url: 'u',
          domain: '',
          createdAtMs: 0,
        },
      ],
      comments: [],
      degraded: false,
    };
    redisGet.mockResolvedValueOnce(JSON.stringify(cached));

    const h = await getAuthorHistory('alice', 'sub1');

    expect(h.posts).toHaveLength(1);
    expect(h.posts[0]!.id).toBe('t3_p9');
    expect(getPostsByUser).not.toHaveBeenCalled();
    expect(getCommentsByUser).not.toHaveBeenCalled();
    expect(redisSet).not.toHaveBeenCalled();
  });

  it('treats corrupt cache as a miss — refetches and overwrites', async () => {
    redisGet.mockResolvedValueOnce('not-json{{{');
    getPostsByUser.mockReturnValueOnce(stubListing([]));
    getCommentsByUser.mockReturnValueOnce(stubListing([]));

    const h = await getAuthorHistory('alice', 'sub1');
    expect(h.posts).toHaveLength(0);
    expect(getPostsByUser).toHaveBeenCalledTimes(1);
    expect(redisSet).toHaveBeenCalledTimes(1);
  });

  it('treats cache with wrong username as a miss', async () => {
    redisGet.mockResolvedValueOnce(
      JSON.stringify({
        username: 'someone-else',
        fetchedAtMs: 0,
        posts: [],
        comments: [],
      })
    );
    getPostsByUser.mockReturnValueOnce(stubListing([]));
    getCommentsByUser.mockReturnValueOnce(stubListing([]));

    await getAuthorHistory('alice', 'sub1');
    expect(getPostsByUser).toHaveBeenCalledTimes(1);
  });

  it('fails OPEN on redis.get error — still fetches fresh from Reddit', async () => {
    redisGet.mockRejectedValueOnce(new Error('redis down'));
    getPostsByUser.mockReturnValueOnce(stubListing([post()]));
    getCommentsByUser.mockReturnValueOnce(stubListing([]));

    const h = await getAuthorHistory('alice', 'sub1');
    expect(h.posts).toHaveLength(1);
  });

  it('AE CRITICAL #5: Reddit fetch error → degraded:true + empty arrays + NOT cached', async () => {
    redisGet.mockResolvedValueOnce(null);
    getPostsByUser.mockImplementationOnce(() => {
      throw new Error('reddit 429 rate-limited');
    });
    getCommentsByUser.mockImplementationOnce(() => {
      throw new Error('reddit 429 rate-limited');
    });

    const h = await getAuthorHistory('alice', 'sub1');
    expect(h.posts).toEqual([]);
    expect(h.comments).toEqual([]);
    expect(h.degraded).toBe(true);
    // Degraded responses MUST NOT be cached. Caching would extend the
    // false-positive window to the 1h TTL — exactly the bug AE CRITICAL #5
    // exists to prevent. The next event should retry against Reddit.
    expect(redisSet).not.toHaveBeenCalled();
  });

  it('AE CRITICAL #5: only posts fetch throws → degraded:true (one half failing taints whole)', async () => {
    redisGet.mockResolvedValueOnce(null);
    getPostsByUser.mockImplementationOnce(() => {
      throw new Error('reddit 503');
    });
    getCommentsByUser.mockReturnValueOnce(stubListing([]));

    const h = await getAuthorHistory('alice', 'sub1');
    expect(h.degraded).toBe(true);
    expect(redisSet).not.toHaveBeenCalled();
  });

  it('AE CRITICAL #5: legit empty (both fetches succeed with [])  → degraded:false + cached', async () => {
    redisGet.mockResolvedValueOnce(null);
    getPostsByUser.mockReturnValueOnce(stubListing([]));
    getCommentsByUser.mockReturnValueOnce(stubListing([]));

    const h = await getAuthorHistory('alice', 'sub1');
    expect(h.posts).toEqual([]);
    expect(h.comments).toEqual([]);
    expect(h.degraded).toBe(false);
    // Legit-empty IS cached — no point hammering Reddit for a user with
    // truly 0 posts/comments.
    expect(redisSet).toHaveBeenCalledTimes(1);
  });

  it('sub-scopes the cache key so two subs do not last-writer-wins each other', async () => {
    redisGet.mockResolvedValue(null);
    getPostsByUser.mockReturnValue(stubListing([]));
    getCommentsByUser.mockReturnValue(stubListing([]));

    await getAuthorHistory('alice', 'sub_a');
    await getAuthorHistory('alice', 'sub_b');

    const k1 = redisSet.mock.calls[0]![0] as string;
    const k2 = redisSet.mock.calls[1]![0] as string;
    expect(k1).toBe('cm:sub_a:author:hist:alice');
    expect(k2).toBe('cm:sub_b:author:hist:alice');
  });

  it('short-circuits on empty username — no Reddit call, no cache write', async () => {
    const h = await getAuthorHistory('', 'sub1');
    expect(h.username).toBe('');
    expect(h.posts).toEqual([]);
    expect(getPostsByUser).not.toHaveBeenCalled();
    expect(redisSet).not.toHaveBeenCalled();
  });

  // AE Polish #77: gemini brutal-audit P1-7. The fail-open path must
  // never block the rule eval when lock acquisition fails — otherwise
  // a Redis blip during lock-NX would silently degrade authorHistory to
  // returning EMPTY_HISTORY for every event, false-positive-ing
  // commentCountLt rules.
  it('Polish #77: falls back to direct fetch when acquireLock returns null', async () => {
    redisGet.mockResolvedValueOnce(null); // cache miss
    acquireLockMock.mockResolvedValueOnce(null); // lock acquire failed (Redis blip OR contention)
    getPostsByUser.mockReturnValueOnce(
      stubListing([post({ id: 't3_p1' })])
    );
    getCommentsByUser.mockReturnValueOnce(stubListing([comment({ id: 't1_c1' })]));

    const h = await getAuthorHistory('alice', 'sub_test');

    // Direct fetch still ran + result returned (no degraded flag).
    expect(h.username).toBe('alice');
    expect(h.posts).toHaveLength(1);
    expect(h.comments).toHaveLength(1);
    expect(h.degraded).toBe(false);
    // Cache write still attempted on fail-open path so subsequent
    // events benefit from the cache even if their lock acquire also
    // fails (self-healing once the Redis blip resolves).
    expect(redisSet).toHaveBeenCalledTimes(1);
  });

  // AE Polish #92: lying-test-name fix. Original title claimed
  // "thundering-herd suppression intent" but the body invoked
  // getAuthorHistory ONCE — "once" is trivially true for any code path.
  // Renamed to reflect what's actually tested: lock acquired w/ correct
  // key + fetch flowed through. A real concurrency assertion lives in
  // the new Polish #92 test below.
  it('Polish #77: single-call cache-miss path acquires lock w/ (author,sub) key + caches result', async () => {
    redisGet.mockResolvedValueOnce(null); // cache miss
    // acquireLockMock default mockResolvedValue: success
    getPostsByUser.mockReturnValueOnce(stubListing([post({ id: 't3_p1' })]));
    getCommentsByUser.mockReturnValueOnce(stubListing([]));

    await getAuthorHistory('alice', 'sub_test');

    expect(acquireLockMock).toHaveBeenCalledTimes(1);
    expect(acquireLockMock).toHaveBeenCalledWith('authorhist:alice', 'sub_test');
    expect(getPostsByUser).toHaveBeenCalledTimes(1);
    expect(redisSet).toHaveBeenCalledTimes(1);
  });

  it('Polish #92: concurrent gets — leader fetches once, follower hits cache (real thundering-herd guard)', async () => {
    // Simulate two concurrent events on the same hot poster. Leader
    // acquires the lock + fetches + writes cache. Follower's lock attempt
    // returns null (lock held by leader) → follower's fallthrough is
    // documented as direct fetch (fail-OPEN). For this test we instead
    // simulate the BEST-CASE timing: follower arrives AFTER leader's
    // cache write, so follower's pre-lock cache check hits.
    let cacheValue: string | null = null;
    redisGet.mockImplementation(async () => cacheValue);
    redisSet.mockImplementation(async (_k: string, v: string) => {
      cacheValue = v;
      return 'OK';
    });
    getPostsByUser.mockReturnValue(stubListing([post({ id: 't3_p1' })]));
    getCommentsByUser.mockReturnValue(stubListing([]));

    // Leader runs first to populate cache.
    await getAuthorHistory('alice', 'sub_test');
    // Follower runs second — should hit the freshly-written cache.
    await getAuthorHistory('alice', 'sub_test');

    // Both calls return data, but Reddit was hit ONLY once.
    expect(getPostsByUser).toHaveBeenCalledTimes(1);
    expect(getCommentsByUser).toHaveBeenCalledTimes(1);
    // Cache was written once (by leader); follower read it.
    expect(redisSet).toHaveBeenCalledTimes(1);
  });

  // AE Polish #78: gemini brutal-audit P1-8. Cache blob shape validation
  // — poisoned blobs (Redis FLUSHDB during a deploy, version-drift,
  // partial write) used to propagate via the unchecked `as AuthorHistory`
  // cast. Now isValidAuthorHistory rejects + the bad slot is del'd so
  // subsequent reads start clean.
  it('Polish #78: shape-mismatch cache blob (missing degraded field) is treated as miss + slot del', async () => {
    // Pre-Polish-#78 / pre-AE-CRITICAL-#5 cache shape — lacks `degraded`.
    const cached = {
      username: 'alice',
      fetchedAtMs: Date.now() - 1000,
      posts: [],
      comments: [],
      // degraded: false  ← MISSING (stale shape from before AE CRITICAL #5)
    };
    redisGet.mockResolvedValueOnce(JSON.stringify(cached));
    getPostsByUser.mockReturnValueOnce(stubListing([]));
    getCommentsByUser.mockReturnValueOnce(stubListing([]));

    await getAuthorHistory('alice', 'sub1');

    // del() must have been called on the stale slot — self-heal.
    expect(redisDel).toHaveBeenCalledWith('cm:sub1:author:hist:alice');
    // Reddit was hit because shape-validation rejected the cache.
    expect(getPostsByUser).toHaveBeenCalledTimes(1);
  });

  it('Polish #78: poisoned non-array `posts` field is rejected (does not propagate)', async () => {
    const poisoned = {
      username: 'alice',
      fetchedAtMs: Date.now(),
      posts: 'not-an-array', // poisoned field type
      comments: [],
      degraded: false,
    };
    redisGet.mockResolvedValueOnce(JSON.stringify(poisoned));
    getPostsByUser.mockReturnValueOnce(stubListing([]));
    getCommentsByUser.mockReturnValueOnce(stubListing([]));

    const h = await getAuthorHistory('alice', 'sub1');

    expect(Array.isArray(h.posts)).toBe(true);
    expect(h.posts).toHaveLength(0);
    expect(redisDel).toHaveBeenCalled();
  });

  it('Polish #78: corrupt JSON triggers del + refetch (self-heal on parse-fail)', async () => {
    redisGet.mockResolvedValueOnce('this is not json{{{');
    getPostsByUser.mockReturnValueOnce(stubListing([]));
    getCommentsByUser.mockReturnValueOnce(stubListing([]));

    await getAuthorHistory('alice', 'sub1');

    expect(redisDel).toHaveBeenCalledWith('cm:sub1:author:hist:alice');
  });

  // AE Polish #93: gap caught by pr-test-analyzer. The Polish #78
  // self-heal calls `redis.del(key)` wrapped in try/catch — the catch
  // branch ("cache del after parse-fail also failed") is uncovered.
  // A regression removing the try/catch would crash the rule path
  // instead of falling through to fetchAndCache.
  it('Polish #93: redis.del failure during self-heal does not throw — fetch still proceeds', async () => {
    redisGet.mockResolvedValueOnce('this is not json{{{');
    redisDel.mockRejectedValueOnce(new Error('del transient redis err'));
    getPostsByUser.mockReturnValueOnce(stubListing([post({ id: 't3_p1' })]));
    getCommentsByUser.mockReturnValueOnce(stubListing([]));

    const h = await getAuthorHistory('alice', 'sub1');

    // Despite the del failure, fetch still ran + payload was returned.
    expect(h.username).toBe('alice');
    expect(h.posts).toHaveLength(1);
    expect(h.degraded).toBe(false);
  });
});
