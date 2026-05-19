/**
 * Polish #32 — scheduler.ts cron handler tests.
 *
 * 3 cron handlers, ZERO direct tests before this:
 *   - /refresh-config  : 5-min wiki poll + atomic publish on rev change
 *   - /stats-rollup    : hourly events:recent50 → snapshot aggregation
 *   - /image-hash-worker : Phase 4.7 one-shot backfill for image-repost
 *
 * The acquireLock single-flight invariant + fail-OPEN behavior on each
 * dependent throw is load-bearing for production — overlapping cron
 * invocations could double-publish a config + race the monotonic pointer
 * guard (W4), and an unhandled throw would surface as a Devvit cron
 * error w/ no recovery.
 *
 * Tests are integration-shaped (Hono request against scheduler) but use
 * vi.mock for every external dep (redis, configStore, loadFromWiki,
 * writeStatsSnapshot, fetchAndDecode, computeBlockhash, recordHash).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const acquireLockMock = vi.fn();
const releaseMock = vi.fn();
const redisGet = vi.fn();
const redisSet = vi.fn();
const configStorePublish = vi.fn();
const loadFromWiki = vi.fn();
const writeStatsSnapshot = vi.fn();
const fetchAndDecode = vi.fn();
const computeBlockhash = vi.fn();
const recordHash = vi.fn();

vi.mock('@devvit/web/server', () => ({
  redis: {
    get: (k: string) => redisGet(k),
    set: (k: string, v: string) => redisSet(k, v),
  },
}));

vi.mock('../../src/lib/idem', () => ({
  acquireLock: (...a: unknown[]) => acquireLockMock(...a),
}));
vi.mock('../../src/state/configStore', () => ({
  publish: (...a: unknown[]) => configStorePublish(...a),
}));
vi.mock('../../src/core/configSource', () => ({
  loadFromWiki: (...a: unknown[]) => loadFromWiki(...a),
}));
vi.mock('../../src/state/statsRollup', () => ({
  writeStatsSnapshot: (...a: unknown[]) => writeStatsSnapshot(...a),
}));
vi.mock('../../src/image/decode', () => ({
  fetchAndDecode: (...a: unknown[]) => fetchAndDecode(...a),
}));
vi.mock('../../src/image/hash', () => ({
  computeBlockhash: (...a: unknown[]) => computeBlockhash(...a),
}));
vi.mock('../../src/state/imageHashStore', () => ({
  recordHash: (...a: unknown[]) => recordHash(...a),
}));

import { scheduler } from '../../src/routes/scheduler';

async function post(path: string, body: unknown = {}): Promise<Response> {
  return scheduler.request(
    new Request(`http://x${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  acquireLockMock.mockResolvedValue(releaseMock);
  releaseMock.mockResolvedValue(undefined);
  redisGet.mockResolvedValue(null);
  redisSet.mockResolvedValue('OK');
});

// ============================================================================
// /refresh-config
// ============================================================================

describe('POST /refresh-config (Polish #32)', () => {
  it('returns ignored when acquireLock fails (overlap protection)', async () => {
    acquireLockMock.mockResolvedValueOnce(null); // lock already held
    const res = await post('/refresh-config');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('ignored');
    expect(loadFromWiki).not.toHaveBeenCalled();
    expect(redisGet).not.toHaveBeenCalled();
  });

  it('returns ignored when no installId pointer (pre-install / wiped)', async () => {
    acquireLockMock.mockResolvedValueOnce(releaseMock);
    redisGet.mockResolvedValueOnce(null); // currentInstallId() → null
    const res = await post('/refresh-config');
    expect((await res.json()) as { status: string }).toEqual({ status: 'ignored' });
    expect(releaseMock).toHaveBeenCalled(); // finally MUST release
    expect(loadFromWiki).not.toHaveBeenCalled();
  });

  it('returns ignored when no subname for installId', async () => {
    acquireLockMock.mockResolvedValueOnce(releaseMock);
    redisGet.mockResolvedValueOnce('install_abc').mockResolvedValueOnce(null);
    const res = await post('/refresh-config');
    expect((await res.json()) as { status: string }).toEqual({ status: 'ignored' });
    expect(releaseMock).toHaveBeenCalled();
    expect(loadFromWiki).not.toHaveBeenCalled();
  });

  it('returns ignored when loadFromWiki returns !ok (page-missing / parse fail)', async () => {
    acquireLockMock.mockResolvedValueOnce(releaseMock);
    redisGet.mockResolvedValueOnce('install_abc').mockResolvedValueOnce('r_test');
    loadFromWiki.mockResolvedValueOnce({ ok: false, reason: 'wiki page missing' });
    const res = await post('/refresh-config');
    expect((await res.json()) as { status: string }).toEqual({ status: 'ignored' });
    expect(releaseMock).toHaveBeenCalled();
    expect(configStorePublish).not.toHaveBeenCalled();
  });

  it('returns success-no-change when revisionId matches cfg:last-wiki-rev (skip publish)', async () => {
    acquireLockMock.mockResolvedValueOnce(releaseMock);
    redisGet
      .mockResolvedValueOnce('install_abc')
      .mockResolvedValueOnce('r_test')
      .mockResolvedValueOnce('wiki_rev_42'); // cfg:last-wiki-rev
    loadFromWiki.mockResolvedValueOnce({
      ok: true,
      revisionId: 'wiki_rev_42',
      config: { runs: [] },
    });
    const res = await post('/refresh-config');
    expect((await res.json()) as { status: string }).toEqual({ status: 'success' });
    expect(configStorePublish).not.toHaveBeenCalled();
    expect(releaseMock).toHaveBeenCalled();
  });

  it('publishes + stamps new wiki rev when revision changed', async () => {
    acquireLockMock.mockResolvedValueOnce(releaseMock);
    redisGet
      .mockResolvedValueOnce('install_abc')
      .mockResolvedValueOnce('r_test')
      .mockResolvedValueOnce('wiki_rev_OLD');
    loadFromWiki.mockResolvedValueOnce({
      ok: true,
      revisionId: 'wiki_rev_NEW',
      config: { runs: [{ name: 'r1' }] },
    });
    configStorePublish.mockResolvedValueOnce(7);
    const res = await post('/refresh-config');
    expect((await res.json()) as { status: string }).toEqual({ status: 'success' });
    expect(configStorePublish).toHaveBeenCalledWith({ runs: [{ name: 'r1' }] }, 'r_test');
    // Stamp the new wiki rev after publish.
    expect(redisSet).toHaveBeenCalledWith(expect.stringContaining('r_test'), 'wiki_rev_NEW');
    expect(releaseMock).toHaveBeenCalled();
  });

  it('returns ignored + releases lock when configStore.publish throws (Polish #63 — silent-failure fix)', async () => {
    acquireLockMock.mockResolvedValueOnce(releaseMock);
    redisGet
      .mockResolvedValueOnce('install_abc')
      .mockResolvedValueOnce('r_test')
      .mockResolvedValueOnce('wiki_rev_OLD');
    loadFromWiki.mockResolvedValueOnce({
      ok: true,
      revisionId: 'wiki_rev_NEW',
      config: { runs: [] },
    });
    configStorePublish.mockRejectedValueOnce(new Error('Redis down'));
    // Polish #63: previously this returned 500 because the publish+set
    // pair was unwrapped → the throw propagated → Hono surfaced an
    // unhandled 500. Mods got NO log signal that wiki sync had silently
    // stopped working. Mirror the /stats-rollup pattern: log.error w/ the
    // PublishError detail + return {status:'ignored'} so the next 5-min
    // tick retries cleanly. The finally still releases the lock — that
    // invariant is preserved (asserted below).
    const res = await post('/refresh-config');
    expect(res.status).toBe(200);
    expect((await res.json()) as { status: string }).toEqual({ status: 'ignored' });
    expect(releaseMock).toHaveBeenCalled();
    // The bad wiki rev must NOT have been stamped — otherwise the next
    // tick would skip and the cluster never recovers.
    expect(redisSet).not.toHaveBeenCalledWith(
      expect.stringContaining('r_test'),
      'wiki_rev_NEW'
    );
  });
});

// ============================================================================
// /stats-rollup
// ============================================================================

describe('POST /stats-rollup (Polish #32)', () => {
  it('returns ignored when acquireLock fails (overlap protection)', async () => {
    acquireLockMock.mockResolvedValueOnce(null);
    const res = await post('/stats-rollup');
    expect((await res.json()) as { status: string }).toEqual({ status: 'ignored' });
    expect(writeStatsSnapshot).not.toHaveBeenCalled();
  });

  it('returns ignored when no installId / subname (pre-install)', async () => {
    acquireLockMock.mockResolvedValueOnce(releaseMock);
    redisGet.mockResolvedValueOnce(null);
    const res = await post('/stats-rollup');
    expect((await res.json()) as { status: string }).toEqual({ status: 'ignored' });
    expect(releaseMock).toHaveBeenCalled();
  });

  it('returns ignored when writeStatsSnapshot persisted=false (Redis write failed)', async () => {
    acquireLockMock.mockResolvedValueOnce(releaseMock);
    redisGet
      .mockResolvedValueOnce('install_abc')
      .mockResolvedValueOnce('r_test');
    writeStatsSnapshot.mockResolvedValueOnce({
      stats: { total: 1, today: 1, lastHour: 0 },
      persisted: false,
      error: 'Redis down',
    });
    const res = await post('/stats-rollup');
    expect((await res.json()) as { status: string }).toEqual({ status: 'ignored' });
  });

  it('returns success when writeStatsSnapshot persisted=true', async () => {
    acquireLockMock.mockResolvedValueOnce(releaseMock);
    redisGet
      .mockResolvedValueOnce('install_abc')
      .mockResolvedValueOnce('r_test');
    writeStatsSnapshot.mockResolvedValueOnce({
      stats: { total: 5, today: 2, lastHour: 1 },
      persisted: true,
    });
    const res = await post('/stats-rollup');
    expect((await res.json()) as { status: string }).toEqual({ status: 'success' });
    expect(writeStatsSnapshot).toHaveBeenCalledWith('r_test');
    expect(releaseMock).toHaveBeenCalled();
  });
});

// ============================================================================
// /image-hash-worker (Phase 4.7)
// ============================================================================

describe('POST /image-hash-worker (Polish #32)', () => {
  it('returns ignored when acquireLock fails', async () => {
    acquireLockMock.mockResolvedValueOnce(null);
    const res = await post('/image-hash-worker', {
      data: { postId: 't3_abc', imageUrl: 'https://i.redd.it/x.jpg' },
    });
    expect((await res.json()) as { status: string }).toEqual({ status: 'ignored' });
    expect(fetchAndDecode).not.toHaveBeenCalled();
  });

  it('returns ignored when body.data is missing required fields', async () => {
    acquireLockMock.mockResolvedValueOnce(releaseMock);
    const res = await post('/image-hash-worker', { data: { postId: 't3_abc' } }); // missing imageUrl
    expect((await res.json()) as { status: string }).toEqual({ status: 'ignored' });
    expect(fetchAndDecode).not.toHaveBeenCalled();
    expect(releaseMock).toHaveBeenCalled();
  });

  it('returns success when decode fails (fail-OPEN per rule posture)', async () => {
    acquireLockMock.mockResolvedValueOnce(releaseMock);
    fetchAndDecode.mockResolvedValueOnce({
      ok: false,
      error: 'unsupported content-type',
      phase: 'unsupported-type',
    });
    const res = await post('/image-hash-worker', {
      data: { postId: 't3_abc', imageUrl: 'https://i.redd.it/x.webp', sub: 'r_test' },
    });
    expect((await res.json()) as { status: string }).toEqual({ status: 'success' });
    expect(recordHash).not.toHaveBeenCalled();
    expect(releaseMock).toHaveBeenCalled();
  });

  it('happy path: decode → hash → recordHash → success', async () => {
    acquireLockMock.mockResolvedValueOnce(releaseMock);
    fetchAndDecode.mockResolvedValueOnce({
      ok: true,
      frame: { width: 16, height: 16, rgba: new Uint8Array(16 * 16 * 4) },
      bytes: 100,
      contentType: 'image/jpeg',
    });
    computeBlockhash.mockReturnValueOnce('a'.repeat(64));
    recordHash.mockResolvedValueOnce(undefined);
    const res = await post('/image-hash-worker', {
      data: { postId: 't3_abc', imageUrl: 'https://i.redd.it/x.jpg', sub: 'r_test' },
    });
    expect((await res.json()) as { status: string }).toEqual({ status: 'success' });
    expect(recordHash).toHaveBeenCalledWith(
      expect.objectContaining({ postId: 't3_abc', hash: 'a'.repeat(64) }),
      undefined,
      'r_test'
    );
  });

  it('fail-OPEN: returns success when computeBlockhash throws (logged, no rethrow)', async () => {
    acquireLockMock.mockResolvedValueOnce(releaseMock);
    fetchAndDecode.mockResolvedValueOnce({
      ok: true,
      frame: { width: 16, height: 16, rgba: new Uint8Array(16 * 16 * 4) },
      bytes: 100,
      contentType: 'image/jpeg',
    });
    computeBlockhash.mockImplementationOnce(() => {
      throw new Error('blockhash threw');
    });
    const res = await post('/image-hash-worker', {
      data: { postId: 't3_abc', imageUrl: 'https://i.redd.it/x.jpg' },
    });
    expect((await res.json()) as { status: string }).toEqual({ status: 'success' });
    expect(recordHash).not.toHaveBeenCalled();
    expect(releaseMock).toHaveBeenCalled();
  });
});
