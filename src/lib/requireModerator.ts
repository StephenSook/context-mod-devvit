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
 */

import { reddit } from '@devvit/web/server';

export type ModAuthResult =
  | { ok: true; sub: string; username: string }
  | { ok: false; status: 401 | 403 | 500; error: string };

export async function requireModerator(): Promise<ModAuthResult> {
  try {
    const sub = (await reddit.getCurrentSubreddit()).name;
    const user = await reddit.getCurrentUser();
    if (!user?.username)
      return { ok: false, status: 401, error: 'not authenticated' };
    const mods = await reddit.getModerators({ subredditName: sub }).all();
    const isMod = mods.some((m) => m.username === user.username);
    if (!isMod)
      return { ok: false, status: 403, error: 'not a moderator of this sub' };
    return { ok: true, sub, username: user.username };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 500, error: `mod check failed: ${msg}` };
  }
}
