/**
 * Task 2: getRecentSample — cached recent-post helper for live-impact preview.
 *
 * Mocks @devvit/web/server so the test runs in pure node without any Devvit
 * runtime. We test the two caching branches: cache hit (no Reddit call) and
 * cache miss (fetch + write through).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const getNewPosts = vi.fn();
const redisGet = vi.fn();
const redisSet = vi.fn();

vi.mock('@devvit/web/server', () => ({
  reddit: { getNewPosts: (o: unknown) => getNewPosts(o) },
  redis: {
    get: (k: string) => redisGet(k),
    set: (k: string, v: string, o?: unknown) => redisSet(k, v, o),
  },
}));

// normalizePost is used inside getRecentSample — stub it so we don't need the
// full Reddit enrichment chain. The stub passes id + isSelf through from the
// payload so I2-related assertions can inspect the normalized item.
vi.mock('../../src/shared/normalize', () => ({
  normalizePost: vi.fn(
    async (p: { post: { id: string; isSelf?: boolean }; author: { name: string; id: string } }) => ({
      item: { id: p.post.id, isSelf: p.post.isSelf ?? false },
      author: { name: p.author.name },
    })
  ),
  // M1: asPayloadTimestamp is now exported from normalize; mock re-exports it
  // as a pass-through so recentSample.ts can import it without error.
  asPayloadTimestamp: (t?: number | Date | string): number | string | undefined => {
    if (t == null) return undefined;
    if (typeof t === 'number') return t;
    if (typeof t === 'string') return t;
    return (t as Date).getTime();
  },
}));

// configStore: getCurrentRev returns a snapshot with a minimal config.
vi.mock('../../src/state/configStore', () => ({
  getCurrentRev: vi.fn(async () => ({
    rev: 0,
    config: { runs: [], needsAuthorEnrichment: false },
  })),
}));

import { getRecentSample } from '../../src/core/recentSample';
import { normalizePost } from '../../src/shared/normalize';

describe('getRecentSample', () => {
  beforeEach(() => {
    getNewPosts.mockReset();
    redisGet.mockReset();
    redisSet.mockReset();
    // Reset normalizePost to the default pass-through between tests so M3's
    // per-throw mock doesn't bleed into other test cases.
    vi.mocked(normalizePost).mockImplementation(
      async (p: { post: { id: string; isSelf?: boolean }; author: { name: string; id: string } }) => ({
        item: { id: p.post.id, isSelf: p.post.isSelf ?? false },
        author: { name: p.author.name },
      })
    );
  });

  it('returns the cached sample without hitting reddit', async () => {
    redisGet.mockResolvedValue(
      JSON.stringify([{ item: { id: 't3_x' }, author: { name: 'a' } }])
    );
    const out = await getRecentSample('sub');
    expect(out).toHaveLength(1);
    expect(getNewPosts).not.toHaveBeenCalled();
  });

  it('fetches + caches on a cache miss', async () => {
    redisGet.mockResolvedValue(null);
    getNewPosts.mockReturnValue({
      all: async () => [
        {
          id: 't3_abc',
          title: 'hello',
          body: null,
          url: 'https://reddit.com/r/sub/comments/abc',
          authorName: 'alice',
          authorId: 't2_alice',
          score: 5,
          nsfw: false,
          locked: false,
          stickied: false,
          createdAt: Date.now(),
        },
      ],
    });
    const out = await getRecentSample('sub');
    expect(getNewPosts).toHaveBeenCalledOnce();
    expect(redisSet).toHaveBeenCalledOnce();
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ item: { id: 't3_abc' }, author: { name: 'alice' } });
  });

  it('returns empty array when reddit returns no posts', async () => {
    redisGet.mockResolvedValue(null);
    getNewPosts.mockReturnValue({ all: async () => [] });
    const out = await getRecentSample('sub');
    expect(out).toHaveLength(0);
    expect(redisSet).toHaveBeenCalledOnce();
  });

  it('still returns data when cache write fails', async () => {
    redisGet.mockResolvedValue(null);
    redisSet.mockRejectedValue(new Error('redis down'));
    getNewPosts.mockReturnValue({
      all: async () => [
        {
          id: 't3_def',
          title: 'test',
          body: null,
          url: 'https://reddit.com/r/sub/comments/def',
          authorName: 'bob',
          authorId: 't2_bob',
          score: 1,
          nsfw: false,
          locked: false,
          stickied: false,
          createdAt: Date.now(),
        },
      ],
    });
    const out = await getRecentSample('sub');
    expect(out).toHaveLength(1);
  });

  // I2: the real isSelf field must take precedence over the URL heuristic.
  // Post has isSelf:true but a URL that does NOT contain the sub name, so the
  // URL heuristic would wrongly yield false. The normalized item must carry
  // isSelf:true because the real field was present.
  it('I2: uses real isSelf field when present, not URL heuristic', async () => {
    redisGet.mockResolvedValue(null);
    getNewPosts.mockReturnValue({
      all: async () => [
        {
          id: 't3_a',
          title: 'image post',
          body: null,
          // URL contains no sub name — heuristic would return false.
          url: 'https://i.redd.it/x.jpg',
          isSelf: true,
          authorName: 'carol',
          authorId: 't2_carol',
          score: 3,
          nsfw: false,
          locked: false,
          stickied: false,
          createdAt: Date.now(),
        },
      ],
    });
    const out = await getRecentSample('sub');
    expect(out).toHaveLength(1);
    // normalizePost stub passes isSelf from the payload onto item.isSelf, so
    // if the real field was used the item should be marked as a self post.
    expect((out[0].item as { isSelf?: boolean }).isSelf).toBe(true);
  });

  // M3: per-post normalize-error skip. When the first post causes normalizePost
  // to throw and the second is valid, the returned array must contain only the
  // valid one (length 1) without the function itself throwing.
  it('M3: skips a post that causes normalizePost to throw, returns the rest', async () => {
    redisGet.mockResolvedValue(null);
    getNewPosts.mockReturnValue({
      all: async () => [
        // First post — will trigger a normalizePost throw.
        {
          id: 't3_bad',
          title: 'malformed',
          body: null,
          url: '',
          authorName: 'x',
          authorId: 't2_x',
          score: 0,
          nsfw: false,
          locked: false,
          stickied: false,
          createdAt: Date.now(),
        },
        // Second post — valid, must survive.
        {
          id: 't3_good',
          title: 'ok',
          body: null,
          url: 'https://reddit.com/r/sub/comments/good',
          authorName: 'y',
          authorId: 't2_y',
          score: 2,
          nsfw: false,
          locked: false,
          stickied: false,
          createdAt: Date.now(),
        },
      ],
    });

    // Make normalizePost throw on the first call, succeed on the second.
    let callCount = 0;
    vi.mocked(normalizePost).mockImplementation(
      async (p: { post: { id: string; isSelf?: boolean }; author: { name: string; id: string } }) => {
        callCount++;
        if (callCount === 1) throw new Error('malformed id');
        return { item: { id: p.post.id, isSelf: false }, author: { name: p.author.name } };
      }
    );

    const out = await getRecentSample('sub');
    expect(out).toHaveLength(1);
    expect((out[0].item as { id: string }).id).toBe('t3_good');
  });
});
