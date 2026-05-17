/**
 * Wave S Phase S5 — AI rule explainer via OpenAI HTTP fetch.
 *
 * Mod pastes a ContextMod JSON5 rule. We POST to OpenAI chat completions w/ a
 * tight system prompt + return the plain-English explanation as a toast.
 *
 * Devvit HTTP fetch policy (PR #96, 2026-05-08): AI-provider allowlist includes
 * api.openai.com. We're inside the allowlist. devvit.json registers the domain.
 *
 * Pure-function design: the fetch dependency is injected so tests can mock the
 * HTTP layer without crawling the real OpenAI API.
 */

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export type ExplainResult =
  | { ok: true; explanation: string }
  | { ok: false; error: string };

const SYSTEM_PROMPT = `You are an assistant explaining ContextMod moderation rules to non-technical subreddit moderators. Given a JSON5 rule, return a single paragraph (2-3 sentences max) describing in plain English: (1) what trigger condition the rule matches, (2) what kind of post or comment it targets, (3) any caveats a mod should know. Avoid jargon. Avoid AI-tone words like 'powerful' or 'simply'. Do not return code blocks — only the prose explanation.`;

export async function explainRule(
  ruleJson5: string,
  apiKey: string,
  fetcher: Fetcher = fetch,
): Promise<ExplainResult> {
  if (!apiKey || !apiKey.trim()) {
    return {
      ok: false,
      error: 'OpenAI API key is missing. Set it in the app installation settings.',
    };
  }
  if (!ruleJson5 || !ruleJson5.trim()) {
    return { ok: false, error: 'Paste a rule JSON5 in the form field, then submit.' };
  }
  if (ruleJson5.length > 4000) {
    return { ok: false, error: 'Rule too long (max 4000 chars). Trim and try again.' };
  }

  try {
    const res = await fetcher('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Explain this rule:\n\n${ruleJson5}` },
        ],
        max_tokens: 240,
        temperature: 0.3,
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `OpenAI HTTP ${res.status}: ${res.statusText}` };
    }
    const data: unknown = await res.json();
    const text = extractCompletionText(data);
    if (!text) {
      return { ok: false, error: 'OpenAI returned no completion text.' };
    }
    return { ok: true, explanation: text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `OpenAI fetch failed: ${msg}` };
  }
}

function extractCompletionText(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as { choices?: { message?: { content?: string } }[] };
  return d.choices?.[0]?.message?.content?.trim() ?? null;
}

export function formatExplainToast(result: ExplainResult): string {
  if (!result.ok) return result.error.slice(0, 400);
  return result.explanation.slice(0, 400);
}
