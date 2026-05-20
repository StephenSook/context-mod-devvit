/**
 * Phase 4.7 — imageHashStore regression suite.
 *
 * Pins: findSimilar within threshold + above threshold; recordHash prepends
 * + caps at MAX_ENTRIES + dedupes by postId; fail-OPEN on Redis errors.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, string>();
vi.mock('@devvit/web/server', () => ({
  redis: {
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
      return 'OK';
    }),
  },
}));

import { findSimilar, recordHash } from '../../src/state/imageHashStore';

const KEY = 'cm:test_sub:img:hash:recent';

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

describe('imageHashStore.findSimilar', () => {
  it('returns null when store is empty', async () => {
    const r = await findSimilar('a'.repeat(64), 8, 'test_sub');
    expect(r).toBeNull();
  });

  it('returns match when within threshold', async () => {
    // '0'^64 stored, query '1' at last position → 1-bit distance, threshold 8
    store.set(
      KEY,
      JSON.stringify([{ postId: 't3_a', hash: '0'.repeat(64), ts: Date.now() }])
    );
    const r = await findSimilar('0'.repeat(63) + '1', 8, 'test_sub');
    expect(r).not.toBeNull();
    expect(r?.entry.postId).toBe('t3_a');
    expect(r?.distance).toBe(1);
  });

  it('returns null when above threshold', async () => {
    // Store all-0, query all-f → 256 bits distance, threshold 8 → no match
    store.set(
      KEY,
      JSON.stringify([{ postId: 't3_a', hash: '0'.repeat(64), ts: Date.now() }])
    );
    const r = await findSimilar('f'.repeat(64), 8, 'test_sub');
    expect(r).toBeNull();
  });

  it('AE Phase 4.7: skips entries with wrong hash length (corruption-tolerant)', async () => {
    store.set(
      KEY,
      JSON.stringify([
        { postId: 't3_bad', hash: 'short', ts: Date.now() },
        { postId: 't3_a', hash: '0'.repeat(64), ts: Date.now() },
      ])
    );
    const r = await findSimilar('0'.repeat(64), 0, 'test_sub');
    expect(r?.entry.postId).toBe('t3_a');
  });

  it('AE Phase 4.7: fail-OPEN on Redis throw — returns null, no crash', async () => {
    const { redis } = await import('@devvit/web/server');
    vi.spyOn(redis, 'get').mockRejectedValueOnce(new Error('redis down'));
    const r = await findSimilar('0'.repeat(64), 8, 'test_sub');
    expect(r).toBeNull();
  });
});

describe('imageHashStore.recordHash', () => {
  it('prepends new entry to empty store', async () => {
    await recordHash(
      { postId: 't3_a', hash: '0'.repeat(64), ts: 100 },
      30 * 86400,
      'test_sub'
    );
    const raw = store.get(KEY)!;
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].postId).toBe('t3_a');
  });

  it('dedupes by postId so same post re-record does not bloat the list', async () => {
    await recordHash(
      { postId: 't3_a', hash: '0'.repeat(64), ts: 100 },
      30 * 86400,
      'test_sub'
    );
    await recordHash(
      { postId: 't3_a', hash: 'f'.repeat(64), ts: 200 },
      30 * 86400,
      'test_sub'
    );
    const parsed = JSON.parse(store.get(KEY)!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].hash).toBe('f'.repeat(64)); // most-recent wins
  });

  it('caps at MAX_ENTRIES (500) — tail entry falls off on prepend', async () => {
    // Pre-seed 500 entries indexed t3_0..t3_499. recordHash prepends the new
    // one and slice(0, 500) keeps the first 500 → t3_499 (the tail) is the
    // one that gets evicted. The store is a recency-ordered list, not a
    // FIFO queue — most-recent-first, so "oldest" is the index-N entry.
    const seed = Array.from({ length: 500 }, (_, i) => ({
      postId: `t3_${i}`,
      hash: i.toString(16).padStart(64, '0'),
      ts: i,
    }));
    store.set(KEY, JSON.stringify(seed));
    await recordHash(
      { postId: 't3_new', hash: 'a'.repeat(64), ts: 999 },
      30 * 86400,
      'test_sub'
    );
    const parsed = JSON.parse(store.get(KEY)!);
    expect(parsed).toHaveLength(500);
    expect(parsed[0].postId).toBe('t3_new');
    // t3_499 (was at seed[499], now at index 500 before slice → dropped)
    expect(parsed.find((e: { postId: string }) => e.postId === 't3_499')).toBeUndefined();
    // t3_0 was at seed[0], now at index 1 → still kept
    expect(parsed.find((e: { postId: string }) => e.postId === 't3_0')).toBeDefined();
  });

  it('no-op on empty postId or hash (defense)', async () => {
    await recordHash({ postId: '', hash: '0'.repeat(64), ts: 100 }, 30 * 86400, 'test_sub');
    await recordHash({ postId: 't3_a', hash: '', ts: 100 }, 30 * 86400, 'test_sub');
    expect(store.get(KEY)).toBeUndefined();
  });

  // AE Polish #64: silent-failure-hunter HIGH regression. Previously a
  // corrupt entry like `{postId: 123, hash: "...", ts: "yesterday"}`
  // passed findSimilar's `hash.length` guard and propagated. The new
  // isValidImageHashEntry validator filters bad entries on BOTH read
  // paths and self-heals the store on write.
  it('Polish #64: findSimilar skips entries with non-string postId', async () => {
    store.set(
      KEY,
      JSON.stringify([
        // Corrupt: postId is a number.
        { postId: 999 as unknown as string, hash: '0'.repeat(64), ts: Date.now() },
        // Good entry below.
        { postId: 't3_good', hash: 'f'.repeat(64), ts: Date.now() },
      ])
    );
    const r = await findSimilar('f'.repeat(64), 8, 'test_sub');
    expect(r?.entry.postId).toBe('t3_good');
  });

  it('Polish #64: findSimilar skips entries with non-number ts', async () => {
    store.set(
      KEY,
      JSON.stringify([
        // Corrupt: ts is a string.
        { postId: 't3_corrupt', hash: '0'.repeat(64), ts: 'yesterday' as unknown as number },
      ])
    );
    const r = await findSimilar('0'.repeat(64), 8, 'test_sub');
    expect(r).toBeNull();
  });

  it('Polish #64: recordHash self-heals — drops corrupt entries on next write', async () => {
    // Seed store with one corrupt + one good entry.
    store.set(
      KEY,
      JSON.stringify([
        { postId: 999 as unknown as string, hash: '0'.repeat(64), ts: Date.now() },
        { postId: 't3_keep', hash: '1'.repeat(64), ts: Date.now() },
      ])
    );
    // Write a new entry — should drop the corrupt one from the persisted array.
    await recordHash(
      { postId: 't3_new', hash: '2'.repeat(64), ts: Date.now() },
      30 * 86400,
      'test_sub'
    );
    const parsed = JSON.parse(store.get(KEY)!);
    expect(parsed).toHaveLength(2);
    expect(parsed.map((e: { postId: string }) => e.postId).sort()).toEqual([
      't3_keep',
      't3_new',
    ]);
  });

  // AE Polish #93: gap caught by pr-test-analyzer. findSimilar has
  // `if (!Array.isArray(entries)) return null;` defending against a
  // stored value that JSON.parses to a non-array (corrupt blob, schema
  // migration drift). No prior test covered this — a regression
  // dropping the guard (e.g. `entries = Array.from(parsed)`) would
  // pass all existing tests but throw on iteration in production.
  it('Polish #93: findSimilar returns null when stored JSON is a non-array', async () => {
    // Object instead of array — corrupt blob.
    store.set(KEY, JSON.stringify({ not: 'an array' }));
    const r = await findSimilar('a'.repeat(64), 8, 'test_sub');
    expect(r).toBeNull();
  });

  it('Polish #93: findSimilar returns null when stored JSON is a bare string', async () => {
    store.set(KEY, JSON.stringify('totally-not-array'));
    const r = await findSimilar('a'.repeat(64), 8, 'test_sub');
    expect(r).toBeNull();
  });

  // AE Polish #102: pr-test-analyzer HIGH gap. Polish #94 BlockHash
  // brand added a charset check via asBlockHash inside
  // isValidImageHashEntry. A corrupt 64-char NON-hex entry would
  // previously slip through the length-only validator and reach
  // hammingDistance's parseInt('z', 16) which returns NaN — silently
  // wrong distance calculation. The Polish #94 try/catch around
  // asBlockHash drops the bad entry. This regression pins that path
  // so a refactor dropping the regex while keeping the length check
  // would now fail loudly.
  it('Polish #102: findSimilar skips entries with 64-char non-hex hash (charset corruption)', async () => {
    store.set(
      KEY,
      JSON.stringify([
        // 64 z's — passes length, fails charset. asBlockHash throws,
        // isValidImageHashEntry catches and returns false, entry dropped.
        { postId: 't3_corrupt_charset', hash: 'z'.repeat(64), ts: Date.now() },
        // Good entry below to verify findSimilar still finds it.
        { postId: 't3_good', hash: 'a'.repeat(64), ts: Date.now() },
      ])
    );
    const r = await findSimilar('a'.repeat(64), 8, 'test_sub');
    expect(r?.entry.postId).toBe('t3_good');
  });
});
