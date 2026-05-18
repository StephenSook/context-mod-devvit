/**
 * AD CRITICAL #2 + #3 regression suite for src/lib/openaiErrors.ts.
 *
 * The classifier is the gate on whether an /explain-event or
 * /explain-rule-submit failure trips the OpenAI circuit breaker. The
 * previous inline copies had:
 *   - `lower.includes('5')` matching every error string containing the
 *     digit 5 (including "Paste a rule JSON5 ..." and "max 4000 chars")
 *   - no match for "timed out" (two words) — the actual phrase
 *     explainEvent.ts:151 emits on AbortError → real OpenAI timeouts
 *     would NOT have tripped the breaker
 *
 * These tests pin both behaviours so a future "small tweak" can't
 * silently re-introduce the misclassification.
 */

import { describe, it, expect } from 'vitest';
import { isTransientOpenaiError } from '../../src/lib/openaiErrors';

describe('isTransientOpenaiError', () => {
  describe('transient — must trip breaker', () => {
    it('matches 5xx HTTP via word-boundary regex', () => {
      expect(isTransientOpenaiError('OpenAI HTTP 500: server error')).toBe(true);
      expect(isTransientOpenaiError('OpenAI HTTP 503: upstream timeout')).toBe(true);
      expect(isTransientOpenaiError('status 504 gateway')).toBe(true);
    });

    it('AD CRITICAL #3 — matches "timed out" (two words) emitted by explainEvent.ts AbortError path', () => {
      expect(isTransientOpenaiError('OpenAI request timed out after 30s. Retry.')).toBe(true);
    });

    it('matches "timeout" (one word) emitted by explainRule.ts AbortError path', () => {
      expect(isTransientOpenaiError('OpenAI request aborted (timeout). Retry.')).toBe(true);
    });

    it('matches network / fetch / aborted / econnreset', () => {
      expect(isTransientOpenaiError('OpenAI network failure: ECONNRESET')).toBe(true);
      expect(isTransientOpenaiError('OpenAI fetch failed: ENOTFOUND')).toBe(true);
      expect(isTransientOpenaiError('Request was aborted before completion')).toBe(true);
    });

    it('matches 429 / rate-limited', () => {
      expect(isTransientOpenaiError('OpenAI HTTP 429: too many requests')).toBe(true);
      expect(isTransientOpenaiError('rate-limited by upstream')).toBe(true);
    });
  });

  describe('non-transient — must NOT trip breaker', () => {
    it('rejects 401 + invalid_api_key', () => {
      expect(isTransientOpenaiError('OpenAI HTTP 401: invalid_api_key')).toBe(false);
    });

    it('rejects missing key', () => {
      expect(
        isTransientOpenaiError('OpenAI API key is missing. Set it in the app installation settings.')
      ).toBe(false);
    });

    it('rejects insufficient_quota', () => {
      expect(isTransientOpenaiError('OpenAI HTTP 429: insufficient_quota')).toBe(false);
    });

    it('AD CRITICAL #2 — rejects "Paste a rule JSON5..." (digit 5 false positive)', () => {
      expect(
        isTransientOpenaiError('Paste a rule JSON5 in the form field, then submit.')
      ).toBe(false);
    });

    it('AD CRITICAL #2 — rejects "Rule too long" message (user-input bound, even if char-count grows past 5000 later)', () => {
      expect(isTransientOpenaiError('Rule too long (max 4000 chars). Trim and try again.')).toBe(
        false
      );
      expect(isTransientOpenaiError('Rule too long (max 5000 chars). Trim and try again.')).toBe(
        false
      );
    });

    it('AD CRITICAL #2 — rejects model name w/ year (2025 contains "5")', () => {
      expect(isTransientOpenaiError('model gpt-4o-mini-2025-02-15 not found')).toBe(false);
    });
  });
});
