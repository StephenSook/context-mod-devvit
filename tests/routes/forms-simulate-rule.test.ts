/**
 * AC test-gap close — /simulate-rule-submit had zero route tests. The Y2-X44
 * cost gates (10KB cap, per-sub rate limit, fail-CLOSED on rl.degraded) +
 * the phase classifier (reddit-api / rule-parse / unexpected) were all
 * unverified; a regression that swaps any of them ships green.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireModeratorMock = vi.fn();
const checkRateLimitMock = vi.fn();
const simulateRuleMock = vi.fn();
const formatSimulationToastMock = vi.fn();
const getCurrentSubreddit = vi.fn(async () => ({ name: 'r_test' }));
const getNewPosts = vi.fn();

vi.mock('@devvit/web/server', () => ({
  reddit: {
    getCurrentSubreddit: () => getCurrentSubreddit(),
    getNewPosts: (opts: unknown) => getNewPosts(opts),
  },
  settings: { get: vi.fn() },
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(),
    incrBy: vi.fn(async () => 1),
    expire: vi.fn(),
  },
}));
vi.mock('../../src/lib/requireModerator', () => ({
  requireModerator: () => requireModeratorMock(),
}));
vi.mock('../../src/lib/ratelimit', () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimitMock(...a),
}));
vi.mock('../../src/lib/circuitBreaker', () => ({
  checkCircuit: vi.fn(async () => ({ state: 'closed' })),
  recordFailure: vi.fn(),
  recordSuccess: vi.fn(),
}));
vi.mock('../../src/core/simulateRule', () => ({
  simulateRule: (...a: unknown[]) => simulateRuleMock(...a),
  formatSimulationToast: (r: unknown) => formatSimulationToastMock(r),
}));
vi.mock('../../src/state/configStore', () => ({
  getCurrentRev: vi.fn(async () => null),
}));
vi.mock('../../src/shared/normalize', () => ({
  normalizePost: vi.fn(async (p: unknown) => ({
    item: { id: (p as { post: { id: string } }).post.id },
    author: { name: 'u', id: 't2_u' },
  })),
  normalizeComment: vi.fn(),
}));
vi.mock('../../src/core/dryRunActivity', () => ({ dryRunActivity: vi.fn() }));
vi.mock('../../src/core/explainRule', () => ({
  explainRule: vi.fn(),
  formatExplainToast: vi.fn(),
}));
vi.mock('../../src/state/apiKeyStore', () => ({
  setOpenaiKey: vi.fn(),
  getOpenaiKey: vi.fn(),
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
  formatSimulationToastMock.mockImplementation(
    (r: { firedCount?: number; totalSamples?: number }) =>
      `Rule would fire on ${r?.firedCount ?? 0}/${r?.totalSamples ?? 0}`
  );
  checkRateLimitMock.mockResolvedValue({
    allowed: true,
    count: 1,
    max: 10,
    resetInSec: 3600,
  });
});

async function postForm(
  body: unknown
): Promise<{ status: number; showToast: string }> {
  const res = await forms.request(
    new Request('http://x/simulate-rule-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
  const json = (await res.json()) as { showToast?: string };
  return { status: res.status, showToast: json.showToast ?? '' };
}

describe('POST /simulate-rule-submit (AC test-gap close)', () => {
  it('rejects non-mod', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const r = await postForm({ ruleJson5: '{ kind: "regex" }' });
    expect(r.showToast).toMatch(/mod-only/i);
    expect(simulateRuleMock).not.toHaveBeenCalled();
  });

  it('rejects empty ruleJson5', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    const r = await postForm({ ruleJson5: '   ' });
    expect(r.showToast).toMatch(/paste a rule/i);
    expect(simulateRuleMock).not.toHaveBeenCalled();
  });

  it('rejects ruleJson5 over 10KB cap', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    const huge = 'x'.repeat(10_001);
    const r = await postForm({ ruleJson5: huge });
    expect(r.showToast).toMatch(/too large/i);
    expect(simulateRuleMock).not.toHaveBeenCalled();
  });

  it('fails-CLOSED on rl.degraded — does NOT fan out to Reddit', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    checkRateLimitMock.mockResolvedValueOnce({
      allowed: true,
      count: 0,
      max: 10,
      resetInSec: 3600,
      degraded: true,
    });
    const r = await postForm({ ruleJson5: '{ kind: "regex" }' });
    expect(r.showToast).toMatch(/degraded/i);
    expect(simulateRuleMock).not.toHaveBeenCalled();
    expect(getNewPosts).not.toHaveBeenCalled();
  });

  it('returns 429-style toast when rate limit exhausted', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    checkRateLimitMock.mockResolvedValueOnce({
      allowed: false,
      count: 11,
      max: 10,
      resetInSec: 1800,
    });
    const r = await postForm({ ruleJson5: '{ kind: "regex" }' });
    expect(r.showToast).toMatch(/rate limit/i);
    expect(r.showToast).toMatch(/30min/i);
    expect(simulateRuleMock).not.toHaveBeenCalled();
  });

  it('classifies getCurrentSubreddit throw as reddit-api phase', async () => {
    requireModeratorMock.mockResolvedValue(AS_MOD);
    getCurrentSubreddit.mockImplementationOnce(async () => {
      throw new Error('getCurrentSubreddit network');
    });
    const r = await postForm({ ruleJson5: '{ kind: "regex" }' });
    expect(r.showToast).toMatch(/reddit-api/i);
  });
});
