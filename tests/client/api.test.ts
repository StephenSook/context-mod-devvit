import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fetchRecentSafe, fetchStatsSafe, ZERO_STATS } from '../../src/client/lib/api';

const ORIGINAL_FETCH = global.fetch;

beforeEach(() => {
  vi.stubGlobal('window', { location: { search: '' } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  global.fetch = ORIGINAL_FETCH;
});

function mockFetch(response: { ok: boolean; status?: number; json?: () => Promise<unknown> }) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    json: response.json ?? (() => Promise.resolve({})),
  }) as unknown as typeof fetch;
}

function mockFetchReject(error: Error) {
  global.fetch = vi.fn().mockRejectedValue(error) as unknown as typeof fetch;
}

describe('fetchRecentSafe', () => {
  it('200 + non-empty events array → ok:true empty:false data', async () => {
    mockFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          events: [
            {
              ts: 1,
              activityId: 't3_a',
              triggered: true,
              actions: [{ kind: 'remove', ok: true }],
            },
          ],
        }),
    });
    const result = await fetchRecentSafe();
    // Strict shape assert prevents the false-pass where implementation returns
    // { ok: true, empty: true } and skips the conditional assertion block
    // (Codex Q3 WARN — conditional assertions can silently pass on wrong branch).
    expect(result).toMatchObject({ ok: true, empty: false });
    if (!result.ok || result.empty) throw new Error('expected non-empty data branch');
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.activityId).toBe('t3_a');
  });

  it('200 + empty events array → ok:true empty:true', async () => {
    mockFetch({ ok: true, json: () => Promise.resolve({ events: [] }) });
    const result = await fetchRecentSafe();
    expect(result).toEqual({ ok: true, empty: true });
  });

  it('200 + missing events key → ok:true empty:true (treats absence as empty)', async () => {
    mockFetch({ ok: true, json: () => Promise.resolve({}) });
    const result = await fetchRecentSafe();
    expect(result).toEqual({ ok: true, empty: true });
  });

  it('200 + non-array events value → ok:true empty:true (defensive)', async () => {
    mockFetch({
      ok: true,
      json: () => Promise.resolve({ events: 'not an array' }),
    });
    const result = await fetchRecentSafe();
    expect(result).toEqual({ ok: true, empty: true });
  });

  it('200 + null events value → ok:true empty:true (defensive, Codex P5 gap)', async () => {
    mockFetch({ ok: true, json: () => Promise.resolve({ events: null }) });
    const result = await fetchRecentSafe();
    expect(result).toEqual({ ok: true, empty: true });
  });

  it('500 error → ok:false error includes HTTP code', async () => {
    mockFetch({ ok: false, status: 500 });
    const result = await fetchRecentSafe();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('500');
  });

  it('404 error → ok:false error includes HTTP code', async () => {
    mockFetch({ ok: false, status: 404 });
    const result = await fetchRecentSafe();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('404');
  });

  it('network failure → ok:false error includes message', async () => {
    mockFetchReject(new Error('Failed to fetch'));
    const result = await fetchRecentSafe();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Failed to fetch');
  });

  it('malformed JSON throws in .json() → caught + ok:false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('Unexpected token')),
    }) as unknown as typeof fetch;
    const result = await fetchRecentSafe();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Unexpected token');
  });

  it('?demo=1 in URL appends to fetch path', async () => {
    vi.stubGlobal('window', { location: { search: '?demo=1' } });
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ events: [] }),
    });
    global.fetch = fetchSpy as unknown as typeof fetch;
    await fetchRecentSafe();
    expect(fetchSpy).toHaveBeenCalledWith('/api/recent?demo=1');
  });

  it('no demo flag → fetch path has no suffix', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ events: [] }),
    });
    global.fetch = fetchSpy as unknown as typeof fetch;
    await fetchRecentSafe();
    expect(fetchSpy).toHaveBeenCalledWith('/api/recent');
  });
});

describe('fetchStatsSafe', () => {
  it('200 + valid counters with hourlyActions24h array → ok:true empty:false data', async () => {
    mockFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          counters: {
            actionsToday: 5,
            timeSavedMin: 12,
            activeRules: 3,
            topRule: 'spam-filter',
            hourlyActions24h: new Array(24).fill(0),
          },
        }),
    });
    const result = await fetchStatsSafe();
    // Strict shape assert prevents false-pass (Codex Q3 WARN).
    expect(result).toMatchObject({ ok: true, empty: false });
    if (!result.ok || result.empty) throw new Error('expected non-empty data branch');
    expect(result.data.actionsToday).toBe(5);
    expect(result.data.topRule).toBe('spam-filter');
  });

  it('200 + missing counters → ok:true empty:true', async () => {
    mockFetch({ ok: true, json: () => Promise.resolve({}) });
    const result = await fetchStatsSafe();
    expect(result).toEqual({ ok: true, empty: true });
  });

  it('200 + counters without hourlyActions24h array → ok:true empty:true', async () => {
    mockFetch({
      ok: true,
      json: () => Promise.resolve({ counters: { actionsToday: 5 } }),
    });
    const result = await fetchStatsSafe();
    expect(result).toEqual({ ok: true, empty: true });
  });

  it('200 + null counters → ok:true empty:true (defensive)', async () => {
    mockFetch({ ok: true, json: () => Promise.resolve({ counters: null }) });
    const result = await fetchStatsSafe();
    expect(result).toEqual({ ok: true, empty: true });
  });

  it('500 error → ok:false', async () => {
    mockFetch({ ok: false, status: 500 });
    const result = await fetchStatsSafe();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('500');
  });

  it('network failure → ok:false', async () => {
    mockFetchReject(new Error('NetworkError'));
    const result = await fetchStatsSafe();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('NetworkError');
  });

  it('?demo=1 propagates to stats fetch path', async () => {
    vi.stubGlobal('window', { location: { search: '?demo=1' } });
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
    global.fetch = fetchSpy as unknown as typeof fetch;
    await fetchStatsSafe();
    expect(fetchSpy).toHaveBeenCalledWith('/api/stats?demo=1');
  });
});

describe('ZERO_STATS', () => {
  it('has 24-slot hourlyActions24h array of zeros', () => {
    expect(ZERO_STATS.hourlyActions24h).toHaveLength(24);
    expect(ZERO_STATS.hourlyActions24h.every((n) => n === 0)).toBe(true);
  });

  it('has zero counters + em-dash topRule placeholder', () => {
    expect(ZERO_STATS.actionsToday).toBe(0);
    expect(ZERO_STATS.timeSavedMin).toBe(0);
    expect(ZERO_STATS.activeRules).toBe(0);
    expect(ZERO_STATS.topRule).toBe('—');
  });
});
