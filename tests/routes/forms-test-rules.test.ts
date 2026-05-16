/**
 * Step 3.6 — form /test-rules-submit invokes dryRunActivity + renders toast bullets.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const dryRunActivity = vi.fn();
const getCurrentSubreddit = vi.fn(async () => ({ name: 'r_test' }));
const getPostById = vi.fn();
const getCommentById = vi.fn();

vi.mock('@devvit/web/server', () => ({
  reddit: {
    getCurrentSubreddit: () => getCurrentSubreddit(),
    getPostById: (id: string) => getPostById(id),
    getCommentById: (id: string) => getCommentById(id),
  },
  redis: {},
}));
vi.mock('../../src/core/dryRunActivity', () => ({
  dryRunActivity: (...a: unknown[]) => dryRunActivity(...a),
}));

import { forms } from '../../src/routes/forms';

beforeEach(() => {
  dryRunActivity.mockReset();
  getPostById.mockReset();
  getCommentById.mockReset();
});

describe('POST /test-rules-submit form handler', () => {
  it('renders triggered actions as toast bullets', async () => {
    getPostById.mockResolvedValueOnce({
      id: 't3_abc', title: 'free crypto giveaway', body: '', url: '', authorName: 'spammer',
    });
    dryRunActivity.mockResolvedValueOnce({
      configPresent: true,
      configRev: 1,
      runs: [{
        runName: 'spam-removal',
        triggered: true,
        checkName: 'crypto-giveaway',
        actions: [
          { kind: 'remove', wouldHaveCalled: 'remove' },
          { kind: 'comment', wouldHaveCalled: 'comment' },
        ],
      }],
    });

    const req = new Request('http://x/test-rules-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { thingId: 't3_abc' } }),
    });
    const res = await forms.request(req);
    const json = await res.json() as { showToast: string };

    expect(json.showToast).toContain('spam-removal');
    expect(json.showToast).toContain('crypto-giveaway');
    expect(json.showToast).toContain('remove');
    expect(json.showToast).toContain('comment');
  });

  it('reports no config when configPresent=false', async () => {
    getPostById.mockResolvedValueOnce({ id: 't3_abc', title: '', body: '', url: '', authorName: 'x' });
    dryRunActivity.mockResolvedValueOnce({ configPresent: false, runs: [] });

    const req = new Request('http://x/test-rules-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { thingId: 't3_abc' } }),
    });
    const res = await forms.request(req);
    const json = await res.json() as { showToast: string };
    expect(json.showToast).toMatch(/no config/i);
  });

  it('reports no triggered runs as explicit pass', async () => {
    getPostById.mockResolvedValueOnce({ id: 't3_abc', title: 'a poem', body: '', url: '', authorName: 'x' });
    dryRunActivity.mockResolvedValueOnce({
      configPresent: true,
      configRev: 1,
      runs: [{ runName: 'spam-removal', triggered: false, actions: [] }],
    });

    const req = new Request('http://x/test-rules-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { thingId: 't3_abc' } }),
    });
    const res = await forms.request(req);
    const json = await res.json() as { showToast: string };
    expect(json.showToast).toMatch(/no rules triggered/i);
  });

  it('routes comments via getCommentById when thingId starts with t1_', async () => {
    getCommentById.mockResolvedValueOnce({ id: 't1_xyz', body: 'a comment', authorName: 'u' });
    dryRunActivity.mockResolvedValueOnce({
      configPresent: true,
      configRev: 1,
      runs: [{ runName: 'spam', triggered: false, actions: [] }],
    });

    const req = new Request('http://x/test-rules-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { thingId: 't1_xyz' } }),
    });
    await forms.request(req);
    expect(getCommentById).toHaveBeenCalledWith('t1_xyz');
    expect(getPostById).not.toHaveBeenCalled();
  });
});
