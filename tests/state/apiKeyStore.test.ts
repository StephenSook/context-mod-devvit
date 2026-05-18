/**
 * W7 regression — apiKeyStore swallows Redis errors by design (read-side null
 * fallback) but throws on write-side invalid input. The fallback chain in
 * forms.ts + api.ts depends on getOpenaiKey returning null (not throwing)
 * for the explainEvent/explainRule resolver to walk to settings.get next.
 *
 * If a future "fix" makes getOpenaiKey re-throw, the entire AI feature
 * 500s on the first Redis blip — these tests pin the swallow contract.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const redisGet = vi.fn();
const redisSet = vi.fn();
const redisDel = vi.fn();

vi.mock('@devvit/web/server', () => ({
  redis: {
    get: (...a: unknown[]) => redisGet(...a),
    set: (...a: unknown[]) => redisSet(...a),
    del: (...a: unknown[]) => redisDel(...a),
  },
}));

import {
  setOpenaiKey,
  getOpenaiKey,
  deleteOpenaiKey,
} from '../../src/state/apiKeyStore';

beforeEach(() => {
  redisGet.mockReset();
  redisSet.mockReset();
  redisDel.mockReset();
});

describe('apiKeyStore (W7)', () => {
  it('setOpenaiKey writes trimmed key at cm:openai-key:{sub}', async () => {
    redisSet.mockResolvedValue('OK');
    await setOpenaiKey('r_test', '  sk-proj-abc123  ');
    expect(redisSet).toHaveBeenCalledWith(
      'cm:openai-key:r_test',
      'sk-proj-abc123'
    );
  });

  it('setOpenaiKey throws on empty sub', async () => {
    await expect(setOpenaiKey('', 'sk-x')).rejects.toThrow(/sub \+ apiKey/);
    expect(redisSet).not.toHaveBeenCalled();
  });

  it('setOpenaiKey throws on whitespace-only key', async () => {
    await expect(setOpenaiKey('r_test', '   ')).rejects.toThrow(
      /sub \+ apiKey/
    );
    expect(redisSet).not.toHaveBeenCalled();
  });

  it('getOpenaiKey returns trimmed key when present', async () => {
    redisGet.mockResolvedValue('  sk-proj-abc123  ');
    const r = await getOpenaiKey('r_test');
    expect(r).toBe('sk-proj-abc123');
  });

  it('getOpenaiKey returns null for whitespace-only stored value', async () => {
    redisGet.mockResolvedValue('   ');
    const r = await getOpenaiKey('r_test');
    expect(r).toBeNull();
  });

  it('getOpenaiKey returns null + does NOT throw when Redis rejects', async () => {
    redisGet.mockRejectedValue(new Error('redis offline'));
    const r = await getOpenaiKey('r_test');
    expect(r).toBeNull();
  });

  it('getOpenaiKey returns null for undefined sub (no Redis call)', async () => {
    const r = await getOpenaiKey(undefined);
    expect(r).toBeNull();
    expect(redisGet).not.toHaveBeenCalled();
  });

  it('deleteOpenaiKey is a no-op on empty sub', async () => {
    await deleteOpenaiKey('');
    expect(redisDel).not.toHaveBeenCalled();
  });

  it('deleteOpenaiKey swallows Redis errors', async () => {
    redisDel.mockRejectedValue(new Error('redis offline'));
    await expect(deleteOpenaiKey('r_test')).resolves.toBeUndefined();
  });
});
