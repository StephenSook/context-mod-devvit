/**
 * loadFromWiki: happy path returns {ok:true, revisionId, config}; missing page
 * returns {ok:false, reason:'not-found'}; invalid JSON5/AJV failure returns
 * {ok:false, reason:'parse-failed'} — never throws.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const getWikiPage = vi.fn();
const checkCircuitMock = vi.fn(async () => ({ state: 'closed' }));
const recordFailureMock = vi.fn();
const recordSuccessMock = vi.fn();

vi.mock('@devvit/web/server', () => ({
  reddit: {
    getWikiPage: (...a: unknown[]) => getWikiPage(...a),
  },
}));
vi.mock('../../src/lib/circuitBreaker', () => ({
  checkCircuit: (...a: unknown[]) => checkCircuitMock(...a),
  recordFailure: (...a: unknown[]) => recordFailureMock(...a),
  recordSuccess: (...a: unknown[]) => recordSuccessMock(...a),
}));

import { loadFromWiki } from '../../src/core/configSource';

beforeEach(() => {
  getWikiPage.mockReset();
  checkCircuitMock.mockReset();
  recordFailureMock.mockReset();
  recordSuccessMock.mockReset();
  checkCircuitMock.mockResolvedValue({ state: 'closed' });
});

describe('loadFromWiki', () => {
  it('returns ok with revisionId + parsed config on happy path', async () => {
    getWikiPage.mockResolvedValueOnce({
      content: `{
        runs: [
          { name: 'r1', checks: [
            { name: 'c1', combinator: 'OR',
              rules: [{ kind: 'regex', pattern: 'spam' }] }
          ] }
        ]
      }`,
      revisionId: '00000000-0000-0000-0000-000000000001',
    });
    const out = await loadFromWiki('my_sub');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.revisionId).toBe('00000000-0000-0000-0000-000000000001');
    expect(out.config.runs[0]?.name).toBe('r1');
  });

  it('returns not-found when getWikiPage throws', async () => {
    getWikiPage.mockRejectedValueOnce(new Error('404'));
    const out = await loadFromWiki('my_sub');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('not-found');
  });

  it('returns parse-failed when JSON5 is malformed', async () => {
    getWikiPage.mockResolvedValueOnce({
      content: 'this is not json5 at all {{{',
      revisionId: 'rev',
    });
    const out = await loadFromWiki('my_sub');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('parse-failed');
  });

  it('returns parse-failed when AJV rejects the shape', async () => {
    getWikiPage.mockResolvedValueOnce({
      content: `{ runs: 'not-an-array' }`,
      revisionId: 'rev',
    });
    const out = await loadFromWiki('my_sub');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('parse-failed');
  });

  it('X4 — returns unreachable on non-404 throw (network/auth failure)', async () => {
    getWikiPage.mockRejectedValueOnce(new Error('ECONNRESET'));
    const out = await loadFromWiki('my_sub');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('unreachable');
  });

  it('X4 — returns not-found on 404-shaped throw', async () => {
    getWikiPage.mockRejectedValueOnce(new Error('page does not exist'));
    const out = await loadFromWiki('my_sub');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('not-found');
  });

  it('X4 — auth/permission errors are unreachable, not not-found', async () => {
    getWikiPage.mockRejectedValueOnce(new Error('403 forbidden'));
    const out = await loadFromWiki('my_sub');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('unreachable');
  });

  it('X46 — returns breaker-open when checkCircuit reports open, does NOT call reddit.getWikiPage', async () => {
    checkCircuitMock.mockResolvedValueOnce({ state: 'open', retryInSec: 42 });
    const out = await loadFromWiki('my_sub');
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('breaker-open');
    expect(getWikiPage).not.toHaveBeenCalled();
  });

  it('X46 — records circuit failure on unreachable, NOT on not-found', async () => {
    getWikiPage.mockRejectedValueOnce(new Error('ECONNRESET'));
    await loadFromWiki('my_sub');
    expect(recordFailureMock).toHaveBeenCalledWith('wiki:my_sub');

    recordFailureMock.mockReset();
    getWikiPage.mockRejectedValueOnce(new Error('page does not exist'));
    await loadFromWiki('my_sub');
    expect(recordFailureMock).not.toHaveBeenCalled();
  });

  it('X46 — records circuit success on happy path AND on parse-failed (wiki API itself succeeded)', async () => {
    getWikiPage.mockResolvedValueOnce({
      content: `{ runs: [{ name: 'r', checks: [] }] }`,
      revisionId: 'rev1',
    });
    await loadFromWiki('my_sub');
    expect(recordSuccessMock).toHaveBeenCalledWith('wiki:my_sub');

    recordSuccessMock.mockReset();
    getWikiPage.mockResolvedValueOnce({
      content: 'not valid json5 {{{',
      revisionId: 'rev2',
    });
    await loadFromWiki('my_sub');
    expect(recordSuccessMock).toHaveBeenCalledWith('wiki:my_sub');
  });
});
