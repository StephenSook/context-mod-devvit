import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchConfigRawSafe, saveConfigSafe, simulateLiveSafe, explainConfigSafe } from '../../src/client/lib/api';

beforeEach(() => { vi.restoreAllMocks(); });

describe('config api helpers', () => {
  it('fetchConfigRawSafe returns content on 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ content: 'runs: []', revisionId: 'rev-1', isDefaultTemplate: false }),
      { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const r = await fetchConfigRawSafe();
    expect(r.ok).toBe(true);
    if (r.ok && !r.empty) expect(r.data.content).toBe('runs: []');
  });

  it('saveConfigSafe surfaces a 409 conflict', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ ok: false, error: 'wiki changed', conflict: true }),
      { status: 409, headers: { 'Content-Type': 'application/json' } })));
    const r = await saveConfigSafe('runs: []', 'rev-1');
    expect(r.ok).toBe(false);
  });

  it('saveConfigSafe success returns rev and ruleCount', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ ok: true, rev: 2, ruleCount: 3 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const r = await saveConfigSafe('runs: []', 'rev-1');
    expect(r.ok).toBe(true);
    if (r.ok && !r.empty) {
      expect(r.data.rev).toBe(2);
      expect(r.data.ruleCount).toBe(3);
    }
  });

  it('simulateLiveSafe body-level failure (200 ok:false)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ ok: false, error: 'bad rule' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const r = await simulateLiveSafe('runs: []');
    expect(r.ok).toBe(false);
  });

  it('fetchConfigRawSafe 503 returns ok:false', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: 'wiki unavailable' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } })));
    const r = await fetchConfigRawSafe();
    expect(r.ok).toBe(false);
  });

  it('explainConfigSafe no-key 400 returns ok:false with OpenAI key message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ ok: false, error: 'No OpenAI key set. Use the "Set OpenAI API key" mod menu.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } })));
    const r = await explainConfigSafe('runs: []');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/OpenAI key/);
  });

  it('explainConfigSafe success returns explanation string', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ ok: true, explanation: 'Removes crypto spam.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const r = await explainConfigSafe('runs: []');
    expect(r.ok).toBe(true);
    if (r.ok && !r.empty) expect(r.data).toBe('Removes crypto spam.');
  });
});
