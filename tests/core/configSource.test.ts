/**
 * loadFromWiki: happy path returns {ok:true, revisionId, config}; missing page
 * returns {ok:false, reason:'not-found'}; invalid JSON5/AJV failure returns
 * {ok:false, reason:'parse-failed'} — never throws.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const getWikiPage = vi.fn();

vi.mock('@devvit/web/server', () => ({
  reddit: {
    getWikiPage: (...a: unknown[]) => getWikiPage(...a),
  },
}));

import { loadFromWiki } from '../../src/core/configSource';

beforeEach(() => {
  getWikiPage.mockReset();
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
});
