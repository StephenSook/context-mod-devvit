/**
 * Phase 4.7 — runImageRepostRule integration suite.
 *
 * decode + hash + store are mocked to focus on the rule's branching:
 *   - non-image post (no imageUrl) → no trigger, no decode call
 *   - decode failure → no trigger (fail-OPEN)
 *   - blockhash failure → no trigger (fail-OPEN)
 *   - no similar match → no trigger + record stored
 *   - similar match found → trigger + record stored
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchAndDecode = vi.fn();
const computeBlockhash = vi.fn();
const findSimilar = vi.fn();
const recordHash = vi.fn();

vi.mock('../../src/image/decode', () => ({
  fetchAndDecode: (...a: unknown[]) => fetchAndDecode(...a),
}));
vi.mock('../../src/image/hash', () => ({
  computeBlockhash: (...a: unknown[]) => computeBlockhash(...a),
}));
vi.mock('../../src/state/imageHashStore', () => ({
  findSimilar: (...a: unknown[]) => findSimilar(...a),
  recordHash: (...a: unknown[]) => recordHash(...a),
}));

import { runImageRepostRule } from '../../src/rules/imageRepost';
import type { Item, ImageRepostRule } from '../../src/shared/types';

const baseItem: Item = {
  id: 't3_a',
  title: 'image post',
  body: '',
  url: 'https://i.redd.it/abc.jpg',
  author: 'u',
  age: 0,
  score: 0,
  isSelf: false,
  over18: false,
  removed: false,
  approved: false,
  locked: false,
  stickied: false,
  linkFlairText: null,
  imageUrl: 'https://preview.redd.it/abc.jpg?width=640&s=sig',
};

const rule: ImageRepostRule = { kind: 'imageRepost' };

beforeEach(() => {
  vi.clearAllMocks();
  recordHash.mockResolvedValue(undefined);
});

describe('runImageRepostRule', () => {
  it('skips post without imageUrl (non-image post) — no fetch, no trigger', async () => {
    const noImage = { ...baseItem, imageUrl: undefined };
    const res = await runImageRepostRule(rule, noImage, 'r_test');
    expect(res.triggered).toBe(false);
    expect(fetchAndDecode).not.toHaveBeenCalled();
  });

  it('skips post without id (defensive) — no fetch, no trigger', async () => {
    const noId = { ...baseItem, id: '' };
    const res = await runImageRepostRule(rule, noId, 'r_test');
    expect(res.triggered).toBe(false);
    expect(fetchAndDecode).not.toHaveBeenCalled();
  });

  it('fail-OPEN on decode failure — no trigger, no recorded hash', async () => {
    fetchAndDecode.mockResolvedValueOnce({
      ok: false,
      error: 'HTTP 404',
      phase: 'fetch',
    });
    const res = await runImageRepostRule(rule, baseItem, 'r_test');
    expect(res.triggered).toBe(false);
    expect(computeBlockhash).not.toHaveBeenCalled();
    expect(recordHash).not.toHaveBeenCalled();
  });

  it('fail-OPEN on blockhash throw — no trigger, no recorded hash', async () => {
    fetchAndDecode.mockResolvedValueOnce({
      ok: true,
      frame: { width: 1, height: 1, rgba: new Uint8Array(4) },
      bytes: 100,
      contentType: 'image/jpeg',
    });
    computeBlockhash.mockImplementationOnce(() => {
      throw new Error('bmvbhash crashed');
    });
    const res = await runImageRepostRule(rule, baseItem, 'r_test');
    expect(res.triggered).toBe(false);
    expect(recordHash).not.toHaveBeenCalled();
  });

  it('no similar match → no trigger + records the new hash for future lookups', async () => {
    fetchAndDecode.mockResolvedValueOnce({
      ok: true,
      frame: { width: 1, height: 1, rgba: new Uint8Array(4) },
      bytes: 100,
      contentType: 'image/jpeg',
    });
    computeBlockhash.mockReturnValueOnce('f'.repeat(64));
    findSimilar.mockResolvedValueOnce(null);
    const res = await runImageRepostRule(rule, baseItem, 'r_test');
    expect(res.triggered).toBe(false);
    expect(recordHash).toHaveBeenCalledWith(
      expect.objectContaining({ postId: 't3_a', hash: 'f'.repeat(64) }),
      expect.any(Number),
      'r_test'
    );
  });

  it('similar match within threshold → trigger + still records (refreshes TTL)', async () => {
    fetchAndDecode.mockResolvedValueOnce({
      ok: true,
      frame: { width: 1, height: 1, rgba: new Uint8Array(4) },
      bytes: 100,
      contentType: 'image/jpeg',
    });
    computeBlockhash.mockReturnValueOnce('a'.repeat(64));
    findSimilar.mockResolvedValueOnce({
      entry: { postId: 't3_prior', hash: 'a'.repeat(64), ts: 1000 },
      distance: 0,
    });
    const res = await runImageRepostRule(rule, baseItem, 'r_test');
    expect(res.triggered).toBe(true);
    expect(recordHash).toHaveBeenCalled(); // record happens AFTER lookup so post can't self-match
  });

  it('honors custom hammingThreshold + windowDays from rule config', async () => {
    fetchAndDecode.mockResolvedValueOnce({
      ok: true,
      frame: { width: 1, height: 1, rgba: new Uint8Array(4) },
      bytes: 100,
      contentType: 'image/jpeg',
    });
    computeBlockhash.mockReturnValueOnce('a'.repeat(64));
    findSimilar.mockResolvedValueOnce(null);
    await runImageRepostRule(
      { kind: 'imageRepost', hammingThreshold: 16, windowDays: 7 },
      baseItem,
      'r_test'
    );
    expect(findSimilar).toHaveBeenCalledWith(expect.any(String), 16, 'r_test');
    expect(recordHash).toHaveBeenCalledWith(
      expect.any(Object),
      7 * 86400, // windowDays → ttlSec
      'r_test'
    );
  });
});
