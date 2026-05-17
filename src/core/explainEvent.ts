/**
 * Wave V Phase V7 — AI summary per event.
 *
 * Reuses the OpenAI Fetcher injection pattern from explainRule.ts. Mod expands
 * an event row in the dashboard, clicks "Explain with AI" → this core builds a
 * tight prompt from the event metadata (no raw body — privacy + token budget)
 * → returns a 2-sentence plain-English summary of why the event fired.
 *
 * Devvit HTTP allowlist already covers api.openai.com (registered in devvit.json
 * for S5 explainRule). Same gpt-4o-mini model for cost discipline.
 */

import type { Fetcher, ExplainResult } from './explainRule';

/**
 * Tight event summary shape — only the fields the AI needs to explain the
 * trigger. Deliberately excludes raw post body to avoid sending content to
 * OpenAI + to keep prompts cheap.
 */
export interface EventSummary {
  runName?: string;
  checkName?: string;
  matchedRule?: string;
  matchedSubstring?: string;
  actions: { kind: string; ok: boolean; status?: string }[];
}

const SYSTEM_PROMPT = `You are explaining a single moderation action taken by ContextMod on a subreddit. Given the event metadata below, write 2 sentences max for a non-technical moderator: (1) what trigger condition matched, (2) what action(s) the bot took. Avoid jargon. Avoid AI-tone words. Plain English. No code blocks. No lists.`;

export async function explainEvent(
  event: EventSummary,
  apiKey: string,
  fetcher: Fetcher = fetch,
): Promise<ExplainResult> {
  if (!apiKey || !apiKey.trim()) {
    return {
      ok: false,
      error: 'OpenAI API key is missing. Set it in the app installation settings.',
    };
  }

  const userPrompt = buildUserPrompt(event);

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
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 160,
        temperature: 0.3,
      }),
    });
    if (!res.ok) {
      let serverMsg = res.statusText;
      try {
        const body = await res.json();
        if (body && typeof body === 'object' && 'error' in body) {
          const e = (body as { error: { message?: string; code?: string } }).error;
          if (e.message) serverMsg = e.message;
          else if (e.code) serverMsg = e.code;
        }
      } catch {
        // body not JSON
      }
      const hint =
        res.status === 401 ? ' (check the openai_api_key app setting)' :
        res.status === 429 ? ' (rate-limited or billing exhausted)' : '';
      return { ok: false, error: `OpenAI HTTP ${res.status}: ${serverMsg}${hint}` };
    }
    const data: unknown = await res.json();
    const text = extractCompletionText(data);
    if (!text) {
      return { ok: false, error: 'OpenAI returned no completion text.' };
    }
    return { ok: true, explanation: text };
  } catch (err) {
    const name = err instanceof Error ? err.name : 'Error';
    const msg = err instanceof Error ? err.message : String(err);
    if (name === 'AbortError') return { ok: false, error: 'OpenAI request aborted (timeout). Retry.' };
    return { ok: false, error: `OpenAI fetch failed: ${msg}` };
  }
}

export function buildUserPrompt(event: EventSummary): string {
  const lines: string[] = [];
  if (event.runName) lines.push(`Run: ${event.runName}`);
  if (event.checkName) lines.push(`Check: ${event.checkName}`);
  if (event.matchedRule) lines.push(`Matched rule: ${event.matchedRule}`);
  if (event.matchedSubstring) lines.push(`Matched substring: "${event.matchedSubstring}"`);
  const actionsLine = event.actions
    .map((a) => `${a.kind}${a.ok ? '' : ' (failed)'}${a.status ? ` [${a.status}]` : ''}`)
    .join(', ');
  if (actionsLine) lines.push(`Actions taken: ${actionsLine}`);
  if (lines.length === 0) return 'No event metadata supplied — describe what kind of moderation event this might be.';
  return lines.join('\n');
}

function extractCompletionText(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as { choices?: { message?: { content?: string } }[] };
  return d.choices?.[0]?.message?.content?.trim() ?? null;
}
