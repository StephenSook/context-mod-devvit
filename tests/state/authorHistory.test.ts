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
const getPostsByUser = vi.fn();
const getCommentsByUser = vi.fn();

vi.mock('@devvit/web/server', () => ({
  redis: {
    get: (...a: unknown[]) => redisGet(...a),
    set: (...a: unknown[]) => redisSet(...a),
  },
  reddit: {
    getPostsByUser: (...a: unknown[]) => getPostsByUser(...a),
    getCommentsByUser: (...a: unknown[]) => getCommentsByUser(...a),
  },
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
  getPostsByUser.mockReset();
  getCommentsByUser.mockReset();
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

  it('fails OPEN on Reddit fetch error — returns empty posts/comments', async () => {
    redisGet.mockResolvedValueOnce(null);
    getPostsByUser.mockImplementationOnce(() => {
      throw new Error('reddit down');
    });
    getCommentsByUser.mockImplementationOnce(() => {
      throw new Error('reddit down');
    });

    const h = await getAuthorHistory('alice', 'sub1');
    expect(h.posts).toEqual([]);
    expect(h.comments).toEqual([]);
    // Still writes (empty) cache so we don't hammer Reddit on every event during outage.
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
});
