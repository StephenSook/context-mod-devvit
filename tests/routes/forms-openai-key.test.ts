/**
 * W9 regression — set-openai-key-submit + explain-rule-submit form handler
 * contracts: auth gate fires, sk- prefix validation, envelope variants
 * (flat + nested), Redis throw surfaces in toast, key fallback chain.
 *
 * The set-openai-key flow is the entire OpenAI onboarding UX. If validation
 * regresses, judges paste their key into the demo and every AI call 401s
 * with no signal back to the mod.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireModeratorMock = vi.fn();
const setOpenaiKeyMock = vi.fn();
const getOpenaiKeyMock = vi.fn();
const explainRuleMock = vi.fn();
const formatExplainToastMock = vi.fn();
const settingsGet = vi.fn();
const getCurrentSubreddit = vi.fn(async () => ({ name: 'r_test' }));

vi.mock('@devvit/web/server', () => ({
  reddit: { getCurrentSubreddit: () => getCurrentSubreddit() },
  settings: { get: (k: string) => settingsGet(k) },
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(),
    incrBy: vi.fn(async () => 1),
    expire: vi.fn(),
  },
}));
vi.mock('../../src/lib/ratelimit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, count: 1, max: 30, resetInSec: 3600 })),
}));
vi.mock('../../src/lib/circuitBreaker', () => ({
  checkCircuit: vi.fn(async () => ({ state: 'closed' })),
  recordFailure: vi.fn(),
  recordSuccess: vi.fn(),
}));
vi.mock('../../src/lib/requireModerator', () => ({
  requireModerator: () => requireModeratorMock(),
}));
vi.mock('../../src/state/apiKeyStore', () => ({
  setOpenaiKey: (...a: unknown[]) => setOpenaiKeyMock(...a),
  getOpenaiKey: (...a: unknown[]) => getOpenaiKeyMock(...a),
}));
vi.mock('../../src/core/explainRule', () => ({
  explainRule: (...a: unknown[]) => explainRuleMock(...a),
  formatExplainToast: (r: unknown) => formatExplainToastMock(r),
}));
vi.mock('../../src/core/dryRunActivity', () => ({ dryRunActivity: vi.fn() }));
vi.mock('../../src/shared/normalize', () => ({
  normalizePost: vi.fn(),
  normalizeComment: vi.fn(),
  // M1: asPayloadTimestamp moved to shared/normalize — must be present in the mock.
  asPayloadTimestamp: (t?: number | Date | string): number | string | undefined => {
    if (t == null) return undefined;
    if (typeof t === 'number') return t;
    if (typeof t === 'string') return t;
    return (t as Date).getTime();
  },
}));
vi.mock('../../src/state/configStore', () => ({ getCurrentRev: vi.fn() }));
vi.mock('../../src/core/simulateRule', () => ({
  simulateRule: vi.fn(),
  formatSimulationToast: vi.fn(),
}));

import { forms } from '../../src/routes/forms';

const AS_MOD = { ok: true as const, sub: 'r_test', username: 'mod_alice' };
const NON_MOD = {
  ok: false as const,
  status: 403 as const,
  error: 'not a moderator of this sub',
};

beforeEach(() => {
  vi.clearAllMocks();
  formatExplainToastMock.mockImplementation((r: { value?: string }) => r?.value ?? '');
});

async function postForm(
  path: string,
  body: unknown
): Promise<{ status: number; showToast: string }> {
  const res = await forms.request(
    new Request(`http://x${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
  const json = (await res.json()) as { showToast?: string };
  return { status: res.status, showToast: json.showToast ?? '' };
}

describe('POST /set-openai-key-submit (W9)', () => {
  it('rejects non-mod with Mod-only toast + does NOT call setOpenaiKey', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const r = await postForm('/set-openai-key-submit', {
      apiKey: 'sk-proj-anything',
    });
    expect(r.showToast).toMatch(/mod-only/i);
    expect(setOpenaiKeyMock).not.toHaveBeenCalled();
  });

  it('rejects empty key', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    const r = await postForm('/set-openai-key-submit', { apiKey: '   ' });
    expect(r.showToast).toMatch(/paste a key/i);
    expect(setOpenaiKeyMock).not.toHaveBeenCalled();
  });

  it('rejects key not starting with sk-', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    const r = await postForm('/set-openai-key-submit', {
      apiKey: 'bearer xyz',
    });
    expect(r.showToast).toMatch(/sk-/);
    expect(setOpenaiKeyMock).not.toHaveBeenCalled();
  });

  it('accepts flat envelope {apiKey}', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    setOpenaiKeyMock.mockResolvedValue(undefined);
    const r = await postForm('/set-openai-key-submit', {
      apiKey: 'sk-proj-abcdef1234567890',
    });
    expect(r.showToast).toMatch(/saved/i);
    expect(setOpenaiKeyMock).toHaveBeenCalledWith('r_test', 'sk-proj-abcdef1234567890');
  });

  it('accepts nested envelope {values: {apiKey}}', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    setOpenaiKeyMock.mockResolvedValue(undefined);
    const r = await postForm('/set-openai-key-submit', {
      values: { apiKey: 'sk-proj-abcdef1234567890' },
    });
    expect(r.showToast).toMatch(/saved/i);
    expect(setOpenaiKeyMock).toHaveBeenCalledWith('r_test', 'sk-proj-abcdef1234567890');
  });

  it('Polish #37: accepts key with leading/trailing whitespace (trim before validate)', async () => {
    // Pre-fix: apiKey.startsWith('sk-') ran on the raw string, so a
    // paste like "  sk-proj-xyz" or "sk-proj-xyz\n" would falsely
    // reject as "Key should start with sk-..." — confusing because
    // apiKeyStore.setOpenaiKey trimmed before storing anyway, so the
    // underlying key was always going to be fine. Now trim happens
    // BEFORE the startsWith check.
    requireModeratorMock.mockResolvedValue(AS_MOD);
    setOpenaiKeyMock.mockResolvedValue(undefined);
    const r = await postForm('/set-openai-key-submit', {
      apiKey: '  sk-proj-pad-with-whitespace  \n',
    });
    expect(r.showToast).toMatch(/saved/i);
    // setOpenaiKey receives the trimmed value (no leading/trailing whitespace).
    expect(setOpenaiKeyMock).toHaveBeenCalledWith(
      'r_test',
      'sk-proj-pad-with-whitespace'
    );
  });

  it('Polish #37: whitespace-only key rejects as "paste a key" (not "should start with sk-")', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    const r = await postForm('/set-openai-key-submit', { apiKey: '   \n\t  ' });
    expect(r.showToast).toMatch(/paste a key/i);
    expect(setOpenaiKeyMock).not.toHaveBeenCalled();
  });

  it('Polish #37: length cap measured on TRIMMED key (whitespace doesn\'t push over 200)', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    setOpenaiKeyMock.mockResolvedValue(undefined);
    // Pre-fix: an exactly-200-char key with leading whitespace would
    // measure >200 against the raw length and reject as "suspiciously long".
    const key = 'sk-' + 'x'.repeat(197); // exactly 200 chars
    const r = await postForm('/set-openai-key-submit', {
      apiKey: '  ' + key + '  ', // pre-trim length 204, post-trim 200
    });
    expect(r.showToast).toMatch(/saved/i);
  });

  it('masks the key in the success toast (first 7 + last 4 only)', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    setOpenaiKeyMock.mockResolvedValue(undefined);
    const r = await postForm('/set-openai-key-submit', {
      apiKey: 'sk-proj-SECRET_BODY_HERE_abcd',
    });
    expect(r.showToast).toContain('sk-proj');
    expect(r.showToast).toContain('abcd');
    expect(r.showToast).not.toContain('SECRET_BODY_HERE');
  });

  it('surfaces Redis throw in toast', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    setOpenaiKeyMock.mockRejectedValue(new Error('redis offline'));
    const r = await postForm('/set-openai-key-submit', {
      apiKey: 'sk-proj-abcdef1234567890',
    });
    expect(r.showToast).toMatch(/save failed/i);
    expect(r.showToast).toContain('redis offline');
  });
});

describe('POST /explain-rule-submit (W9)', () => {
  it('rejects non-mod (OpenAI quota protection)', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const r = await postForm('/explain-rule-submit', { ruleJson5: '{}' });
    expect(r.showToast).toMatch(/mod-only/i);
    expect(explainRuleMock).not.toHaveBeenCalled();
  });

  it('uses Redis key when present + falls back to settings when null', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    getOpenaiKeyMock.mockResolvedValue('sk-redis-key');
    explainRuleMock.mockResolvedValue({ ok: true, value: 'this rule does X' });
    await postForm('/explain-rule-submit', { ruleJson5: '{ kind: "regex" }' });
    expect(explainRuleMock).toHaveBeenCalledWith('{ kind: "regex" }', 'sk-redis-key');

    vi.clearAllMocks();
    formatExplainToastMock.mockImplementation(
      (r: { value?: string }) => r?.value ?? ''
    );
    requireModeratorMock.mockResolvedValue(AS_MOD);
    getOpenaiKeyMock.mockResolvedValue(null);
    settingsGet.mockResolvedValue('sk-settings-key');
    explainRuleMock.mockResolvedValue({ ok: true, value: 'this rule does Y' });
    await postForm('/explain-rule-submit', { ruleJson5: '{}' });
    expect(explainRuleMock).toHaveBeenCalledWith('{}', 'sk-settings-key');
  });
});
