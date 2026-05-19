import { describe, it, expect, vi } from 'vitest';
import { explainRule, formatExplainToast } from '../../src/core/explainRule';

function mockFetcher(response: { ok: boolean; status?: number; body: unknown }) {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(response.body), {
        status: response.status ?? (response.ok ? 200 : 500),
      })
  );
}

describe('explainRule', () => {
  it('rejects missing API key', async () => {
    const r = await explainRule('{kind:"regex"}', '');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/api key/i);
  });

  it('rejects empty rule', async () => {
    const r = await explainRule('', 'sk-fake');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/paste a rule/i);
  });

  it('rejects too-long rule', async () => {
    const r = await explainRule('x'.repeat(4001), 'sk-fake');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/too long/i);
  });

  it('parses successful OpenAI response', async () => {
    const fetcher = mockFetcher({
      ok: true,
      body: {
        choices: [{ message: { content: 'This rule matches posts about crypto.' } }],
      },
    });
    const r = await explainRule("{kind:'regex',pattern:'crypto'}", 'sk-fake', fetcher);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toContain('crypto');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('surfaces OpenAI HTTP error', async () => {
    const fetcher = mockFetcher({
      ok: false,
      status: 401,
      body: { error: 'invalid_api_key' },
    });
    const r = await explainRule('{kind:"regex"}', 'sk-bad', fetcher);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('401');
  });

  it('handles malformed OpenAI response', async () => {
    const fetcher = mockFetcher({ ok: true, body: { something_else: true } });
    const r = await explainRule('{kind:"regex"}', 'sk-fake', fetcher);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no completion text/i);
  });

  it('handles network failure', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('network unreachable');
    });
    const r = await explainRule('{kind:"regex"}', 'sk-fake', fetcher);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/fetch failed/i);
  });

  it('sets correct headers + body shape', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 })
    );
    await explainRule("{kind:'regex'}", 'sk-test', fetcher);
    const call = fetcher.mock.calls[0];
    expect(call?.[0]).toBe('https://api.openai.com/v1/chat/completions');
    const init = call?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer sk-test');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.messages).toHaveLength(2);
  });

  it('Polish #25: passes AbortSignal to fetcher (timeout protection)', async () => {
    // Before fix: AbortError catch branch existed but no controller was wired,
    // so a hung OpenAI request would block forever. Now signal is set.
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 })
    );
    await explainRule('{kind:"regex"}', 'sk-test', fetcher);
    const init = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.signal).toBeDefined();
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('Polish #25: AbortError from timed-out fetcher → "aborted (timeout)" error', async () => {
    // Simulate the underlying fetch surfacing AbortError after the controller
    // fires its timeout.
    const fetcher = vi.fn(async () => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    });
    const r = await explainRule('{kind:"regex"}', 'sk-test', fetcher);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/aborted/i);
      expect(r.error).toMatch(/timeout/i);
    }
  });
});

describe('formatExplainToast', () => {
  it('truncates explanations to 400 chars', () => {
    const r = { ok: true as const, value: 'x'.repeat(800) };
    expect(formatExplainToast(r).length).toBe(400);
  });

  it('truncates errors to 400 chars', () => {
    const r = { ok: false as const, error: 'x'.repeat(800) };
    expect(formatExplainToast(r).length).toBe(400);
  });
});
