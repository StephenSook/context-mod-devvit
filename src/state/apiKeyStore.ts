/**
 * Per-sub OpenAI API key storage.
 *
 * Workaround for Devvit settings infra limitations (Wave V hotfix 2026-05-17):
 *   - Global-scope settings: CLI `devvit settings set` fails w/ Unimplemented RPC
 *   - Subreddit-scope settings: schema doesn't allow isSecret (plaintext at rest)
 *
 * Redis-backed approach:
 *   - Stored at `cm:openai-key:{sub}` — encrypted at rest by Devvit's per-install Redis
 *   - Set via "ContextMod: Set OpenAI API key" mod menu
 *   - Read by explainRule + explainEvent before falling back to Devvit settings
 */

import { redis } from '@devvit/web/server';

function key(sub: string): string {
  return `cm:openai-key:${sub}`;
}

export async function setOpenaiKey(sub: string, apiKey: string): Promise<void> {
  if (!sub || !apiKey?.trim()) throw new Error('sub + apiKey required');
  await redis.set(key(sub), apiKey.trim());
}

export async function getOpenaiKey(sub: string | undefined): Promise<string | null> {
  if (!sub) return null;
  try {
    const v = await redis.get(key(sub));
    return v && v.trim() ? v.trim() : null;
  } catch (err) {
    console.warn('[cm/apiKeyStore] getOpenaiKey failed:', err);
    return null;
  }
}

export async function deleteOpenaiKey(sub: string): Promise<void> {
  if (!sub) return;
  try {
    await redis.del(key(sub));
  } catch (err) {
    console.warn('[cm/apiKeyStore] deleteOpenaiKey failed:', err);
  }
}
