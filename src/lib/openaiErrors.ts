/**
 * AD CRITICAL #2 + #9 fix — unified OpenAI error classifier.
 *
 * The circuit breaker for the OpenAI dependency must distinguish:
 *   - TRANSIENT failures (5xx, network, timeout, 429, ECONNRESET, AbortError)
 *     → trip the breaker so the install backs off for the cooldown window
 *   - NON-TRANSIENT failures (401, missing key, invalid_api_key,
 *     insufficient_quota) → user-config issues; tripping the breaker
 *     punishes the whole install for a single mod's typo
 *
 * Was duplicated verbatim in src/routes/api.ts + src/routes/forms.ts with a
 * comment promising both copies would stay in sync. They drifted (one had an
 * inline `// 5xx HTTP` comment, the other did not). More importantly, the
 * previous `lower.includes('5')` matched ANY string containing the digit 5
 * → false-positive transient classification on benign errors like
 * "Rule too long (max 4000 chars)" or "model gpt-4o-mini-2025-02-15".
 * Tightened to a regex that matches only the 5xx HTTP status range.
 */

export function isTransientOpenaiError(error: string): boolean {
  const lower = error.toLowerCase();
  // Non-transient — user config errors that must not trip the breaker.
  // Keep this list in sync with the error strings emitted by
  // src/core/explainRule.ts + src/core/explainEvent.ts validation paths;
  // any user-input error that returns from `err(...)` should appear here.
  if (lower.includes('missing') || lower.includes('api key')) return false;
  if (lower.includes('401') || lower.includes('invalid_api_key')) return false;
  if (lower.includes('insufficient_quota')) return false;
  if (lower.includes('paste a rule')) return false;
  if (lower.includes('rule too long')) return false;
  return (
    HTTP_5XX.test(lower) ||
    // AD CRITICAL #3: explainEvent.ts emits "timed out" (two words); explainRule.ts
    // emits "aborted (timeout)" (one word). Match BOTH so real 30s OpenAI
    // timeouts trip the breaker as intended by X37/X43.
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('aborted') ||
    lower.includes('econnreset') ||
    lower.includes('429') ||
    lower.includes('rate-limited')
  );
}

// Word-boundary 5xx — matches "HTTP 503" / "(500)" / "status 504:" but NOT
// "max 4000 chars" / "model gpt-4o-mini-2025-02-15" / "JSON5" / token counts of "5".
const HTTP_5XX = /(?:^|\D)5\d{2}(?:\D|$)/;
