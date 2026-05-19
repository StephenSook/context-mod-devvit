/**
 * Verifies the caller is a moderator of the current subreddit BEFORE
 * mutating shared state or calling cost-bearing APIs.
 *
 * Why this exists at handler level when Devvit menus already gate
 * `forUserType: moderator`: form-submit + /api/* endpoints are HTTP-reachable
 * by any authenticated viewer of the dashboard custom post, not just the
 * mod who triggered a menu item. Defense-in-depth required.
 *
 * Return shape is a discriminated union; the caller chooses how to surface
 * the failure (HTTP status for /api/*, showToast for Devvit forms).
 *
 * AE Polish #10 (Agent B #5): previously a single catch-all returned
 * status:500 for every thrown error — including transient Reddit-API
 * blips (network, rate-limit, server 5xx) that the caller should retry.
 * The frontend then surfaced generic "server error" w/ no retry hint.
 * Now we classify the exception via shape heuristics + return 503
 * (Service Unavailable, retry-after-implied) for transient categories,
 * keeping 500 strictly for "programming error in this code" cases.
 */

import { reddit } from '@devvit/web/server';

export type ModAuthResult =
  | { ok: true; sub: string; username: string }
  | { ok: false; status: 401 | 403 | 500 | 503; error: string };

function classifyTransient(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('network') ||
    lower.includes('econnreset') ||
    lower.includes('econnrefused') ||
    lower.includes('etimedout') ||
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    lower.includes('429') ||
    lower.includes('rate-limited') ||
    lower.includes('rate limit') ||
    // Match 5xx HTTP w/ word-boundary regex (same shape as openaiErrors.ts)
    /(?:^|\D)5\d{2}(?:\D|$)/.test(lower) ||
    lower.includes('fetch failed') ||
    lower.includes('aborted')
  );
}

export async function requireModerator(): Promise<ModAuthResult> {
  try {
    const sub = (await reddit.getCurrentSubreddit()).name;
    const user = await reddit.getCurrentUser();
    if (!user?.username) return { ok: false, status: 401, error: 'not authenticated' };
    const mods = await reddit.getModerators({ subredditName: sub }).all();
    const isMod = mods.some((m) => m.username === user.username);
    if (!isMod) return { ok: false, status: 403, error: 'not a moderator of this sub' };
    return { ok: true, sub, username: user.username };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (classifyTransient(msg)) {
      return {
        ok: false,
        status: 503,
        error: `mod check transient failure (retry in ~30s): ${msg}`,
      };
    }
    return { ok: false, status: 500, error: `mod check failed: ${msg}` };
  }
}
