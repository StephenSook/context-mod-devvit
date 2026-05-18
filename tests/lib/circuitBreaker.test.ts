/**
 * X37 — circuit breaker state-machine contract.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, string>();
const expiries = new Map<string, number>();

vi.mock('@devvit/web/server', () => ({
  redis: {
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
      return 'OK';
    }),
    del: vi.fn(async (k: string) => {
      store.delete(k);
      expiries.delete(k);
    }),
    incrBy: vi.fn(async (k: string, n: number) => {
      const cur = Number.parseInt(store.get(k) ?? '0', 10);
      const next = cur + n;
      store.set(k, String(next));
      return next;
    }),
    expire: vi.fn(async (k: string, sec: number) => {
      expiries.set(k, Date.now() + sec * 1000);
    }),
  },
}));

import { checkCircuit, recordFailure, recordSuccess } from '../../src/lib/circuitBreaker';

beforeEach(() => {
  store.clear();
  expiries.clear();
});

describe('circuit breaker (X37)', () => {
  it('starts closed when no failures recorded', async () => {
    const r = await checkCircuit('openai');
    expect(r.state).toBe('closed');
  });

  it('stays closed for failures below threshold', async () => {
    for (let i = 0; i < 4; i++) await recordFailure('openai', { threshold: 5 });
    const r = await checkCircuit('openai');
    expect(r.state).toBe('closed');
  });

  it('opens when failures reach threshold', async () => {
    for (let i = 0; i < 5; i++) await recordFailure('openai', { threshold: 5, openSec: 60 });
    const r = await checkCircuit('openai', { openSec: 60 });
    expect(r.state).toBe('open');
    expect(r.retryInSec).toBeGreaterThan(0);
    expect(r.retryInSec).toBeLessThanOrEqual(60);
  });

  it('transitions to half-open after openSec elapses', async () => {
    // Pre-populate as if circuit opened a minute ago
    store.set('cm:cb:openai:opened-at', String(Date.now() - 61_000));
    const r = await checkCircuit('openai', { openSec: 60 });
    expect(r.state).toBe('half-open');
  });

  it('recordSuccess clears failures + opened-at (resets to closed)', async () => {
    for (let i = 0; i < 5; i++) await recordFailure('openai', { threshold: 5 });
    expect((await checkCircuit('openai')).state).toBe('open');
    await recordSuccess('openai');
    expect((await checkCircuit('openai')).state).toBe('closed');
  });

  it('isolates breakers per bucket', async () => {
    for (let i = 0; i < 5; i++) await recordFailure('openai', { threshold: 5 });
    expect((await checkCircuit('openai')).state).toBe('open');
    expect((await checkCircuit('reddit')).state).toBe('closed');
  });
});
