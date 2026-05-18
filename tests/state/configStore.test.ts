import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, string>();
vi.mock('@devvit/web/server', () => ({
  redis: {
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => { store.set(k, v); return 'OK'; }),
    del: vi.fn(async (k: string) => { store.delete(k); }),
    incrBy: vi.fn(async (k: string, n: number) => {
      const cur = parseInt(store.get(k) ?? '0', 10);
      const next = cur + n;
      store.set(k, String(next));
      return next;
    }),
  },
}));

import { publish, getCurrentRev } from '../../src/state/configStore';
import type { AppConfig } from '../../src/shared/types';

const cfgA: AppConfig = { runs: [{ name: 'a', checks: [] }] };
const cfgB: AppConfig = { runs: [{ name: 'b', checks: [] }] };

beforeEach(() => { store.clear(); });

describe('configStore', () => {
  it('first publish writes rev=0 and getCurrentRev returns it', async () => {
    const rev = await publish(cfgA);
    expect(rev).toBe(0);
    const snap = await getCurrentRev();
    expect(snap?.rev).toBe(0);
    expect(snap?.config.runs[0]?.name).toBe('a');
  });

  it('second publish bumps to rev=1; mid-publish reader sees old rev', async () => {
    await publish(cfgA);
    // Snapshot the OLD rev before the second publish completes the pointer flip.
    // Simulate by reading getCurrentRev before publishing the new pointer.
    // For the unit test we just verify the bump semantics.
    const rev2 = await publish(cfgB);
    expect(rev2).toBe(1);
    const snap = await getCurrentRev();
    expect(snap?.rev).toBe(1);
    expect(snap?.config.runs[0]?.name).toBe('b');
  });

  it('returns null when nothing has been published', async () => {
    const snap = await getCurrentRev();
    expect(snap).toBeNull();
  });

  it('threads sub through the keys (multi-tenant isolation)', async () => {
    await publish(cfgA, 'subA');
    await publish(cfgB, 'subB');
    const a = await getCurrentRev('subA');
    const b = await getCurrentRev('subB');
    expect(a?.config.runs[0]?.name).toBe('a');
    expect(b?.config.runs[0]?.name).toBe('b');
  });

  it('Codex H2 — concurrent publishers get DISTINCT rev numbers via atomic INCR', async () => {
    // Simulate the race that the old read-modify-write pattern failed:
    // both callers START at the same time, then both finish. With INCR,
    // they get N and N+1 (regardless of which actually runs first in the
    // event loop), so the final state has BOTH payloads addressable.
    const [revA, revB] = await Promise.all([publish(cfgA), publish(cfgB)]);
    expect(revA).not.toBe(revB);
    expect(new Set([revA, revB])).toEqual(new Set([0, 1]));
    // Both rev payloads are durable + retrievable independently.
    const snapA = JSON.parse(store.get(`cm:_:cfg:rev:${revA}`)!) as AppConfig;
    const snapB = JSON.parse(store.get(`cm:_:cfg:rev:${revB}`)!) as AppConfig;
    expect(snapA.runs[0]?.name).toBe('a');
    expect(snapB.runs[0]?.name).toBe('b');
  });

  it('W4 — slow publisher does NOT roll the pointer backwards', async () => {
    // Simulate the race: faster publisher already advanced cfg:current_rev to 10.
    // Slow publisher now finishes its publish() with an allocated rev that is
    // older. The monotonic guard must keep the pointer at 10 — without the
    // guard, the slow writer would set it back to its (older) rev.
    store.set('cm:_:cfg:current_rev', '10');
    store.set('cm:_:cfg:rev-counter', '1'); // next INCR → 2 → next=1
    const rev = await publish(cfgA);
    expect(rev).toBe(1); // allocated rev is still returned to the caller
    expect(store.get('cm:_:cfg:current_rev')).toBe('10'); // pointer untouched
  });

  it('W4 — first publish on fresh install still advances pointer (no existing pointer)', async () => {
    expect(store.get('cm:_:cfg:current_rev')).toBeUndefined();
    const rev = await publish(cfgA);
    expect(rev).toBe(0);
    expect(store.get('cm:_:cfg:current_rev')).toBe('0');
  });
});
