/**
 * Polish #19 — friendlyExplainError() maps raw server errors from
 * /api/explain-event to mod-friendly UX strings. Critical that the
 * 503 transient mod-check failure (added in AE Polish #10) doesn't
 * fall through to raw-truncate, otherwise mods see
 * "mod check transient failure (retry in ~30s): fetch failed" instead
 * of a clean "Reddit's mod API is briefly unavailable" message.
 */

import { describe, it, expect } from 'vitest';
import { friendlyExplainError } from '../../src/client/components/EventDetails';

describe('friendlyExplainError', () => {
  it('Polish #19: maps 503 mod-check transient failure to retry message', () => {
    const raw = 'mod check transient failure (retry in ~30s): fetch failed';
    const friendly = friendlyExplainError(raw);
    expect(friendly).toMatch(/Reddit's mod API/i);
    expect(friendly).toMatch(/30s/);
    expect(friendly).not.toMatch(/Sign in as a moderator/i);
  });

  it('Polish #19: matches "transient failure" substring (alt phrasing)', () => {
    const raw = 'mod check transient failure (retry in ~30s): ECONNRESET';
    expect(friendlyExplainError(raw)).toMatch(/briefly unavailable/i);
  });

  it('still surfaces auth failure as Sign in message (401/403)', () => {
    expect(friendlyExplainError('Unauthorized: mod auth required')).toMatch(/Sign in as a moderator/i);
    expect(friendlyExplainError('HTTP 401')).toMatch(/Sign in as a moderator/i);
    expect(friendlyExplainError('Forbidden: not a moderator of this sub')).toMatch(/Sign in as a moderator/i);
  });

  it('passes through rate-limit raw (already mod-friendly per api.ts)', () => {
    const raw = 'rate limit exceeded — try again in 60s';
    expect(friendlyExplainError(raw)).toBe(raw);
  });

  it('maps circuit breaker open to AI-temporarily-unavailable', () => {
    expect(friendlyExplainError('OpenAI breaker open — too many recent failures')).toMatch(
      /AI service is temporarily unavailable/i,
    );
  });

  it('maps missing API key to setup hint', () => {
    expect(friendlyExplainError('OpenAI API key missing')).toMatch(/OpenAI API key is not configured/i);
  });

  it('maps Redis subsystem degraded to backend-degraded message', () => {
    expect(friendlyExplainError('redis subsystem degraded')).toMatch(/Backend storage is degraded/i);
  });

  it('maps OpenAI timeout to transient hiccup message', () => {
    expect(friendlyExplainError('OpenAI call timed out after 30s')).toMatch(/AI request timed out/i);
  });

  it('truncates long unknown errors at 160 chars + ellipsis', () => {
    const longRaw = 'unknown error: ' + 'x'.repeat(200);
    const out = friendlyExplainError(longRaw);
    expect(out.length).toBeLessThanOrEqual(161);
    expect(out.endsWith('…')).toBe(true);
  });

  it('returns short unknown errors verbatim (no truncation)', () => {
    const raw = 'something weird happened';
    expect(friendlyExplainError(raw)).toBe(raw);
  });

  it('Polish #19: ordering — "mod check transient" check fires before generic "mod"-substring matches', () => {
    // Defensive: even though the new branch uses 'mod check transient' (specific),
    // confirm a misleading message like "mod check transient" doesn't also get
    // misclassified as a 401/403 because 'mod auth' substring isn't present.
    const raw = 'mod check transient failure (retry in ~30s): ETIMEDOUT';
    const out = friendlyExplainError(raw);
    expect(out).not.toMatch(/Sign in as a moderator/i);
    expect(out).toMatch(/briefly unavailable/i);
  });
});
