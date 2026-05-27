import { settings } from '@devvit/web/server';
import { getOpenaiKey } from '../state/apiKeyStore';

/** Resolve the OpenAI key for a sub: encrypted-Redis key first, then the
 * plaintext Devvit subreddit-setting fallback. Returns '' when neither set.
 *
 * Note: getOpenaiKey swallows Redis read errors and returns null, so a Redis
 * outage silently falls through to the settings fallback rather than throwing.
 * Callers see '' only when both sources are genuinely absent. */
export async function resolveOpenaiKey(sub: string): Promise<string> {
  const fromRedis = await getOpenaiKey(sub);
  // getOpenaiKey returns null when absent; '' can't come from it (trimmed at write time).
  if (fromRedis) return fromRedis;
  return ((await settings.get<string>('openai_api_key')) ?? '').trim();
}
