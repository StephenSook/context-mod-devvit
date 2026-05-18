/**
 * Step 3.6 — menu /test-rules wires to UiResponse.showForm with thingId pre-filled.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@devvit/web/server', () => ({
  reddit: {},
  redis: {},
}));
vi.mock('../../src/core/configSource', () => ({
  loadFromWiki: vi.fn(),
  WIKI_PAGE: 'botconfig/contextmod',
}));
vi.mock('../../src/state/configStore');

import { menu } from '../../src/routes/menu';

describe('POST /test-rules menu handler', () => {
  it('returns showForm UiResponse with thingId pre-filled', async () => {
    const req = new Request('http://x/test-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: 't3_abc' }),
    });
    const res = await menu.request(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      showForm: {
        name: string;
        form: { fields: { name: string; defaultValue: string }[] };
      };
    };
    expect(json.showForm.name).toBe('testRules');
    expect(json.showForm.form.fields[0]).toMatchObject({
      name: 'thingId',
      defaultValue: 't3_abc',
    });
    // Codex/playtest 2026-05-16: field MUST NOT be disabled — Devvit drops
    // disabled fields from form submission, so the handler would receive
    // thingId=undefined and bail. Regression test pins editable shape.
    expect(
      (json.showForm.form.fields[0] as { disabled?: boolean }).disabled
    ).toBeUndefined();
  });

  it('returns toast when targetId missing (mod invoked from subreddit menu, not post/comment)', async () => {
    const req = new Request('http://x/test-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await menu.request(req);
    const json = (await res.json()) as { showToast?: string };
    expect(json.showToast).toMatch(/post or comment/i);
  });
});
