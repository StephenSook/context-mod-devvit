/**
 * Wiki config loader (Step 3.2).
 *
 * Mods edit `r/<sub>/wiki/botconfig/contextmod`; this module fetches that
 * page, hands the content to `parseConfig` (JSON5 + AJV), and returns
 * `{ revisionId, config }` so the caller can short-circuit a publish when
 * nothing changed.
 *
 * Errors are surfaced as `null` (not thrown) so the cron and mod-menu paths
 * can decide the right user-facing message — a missing page should not crash
 * the cron. Parse failures log the AJV errors at error level so mods can
 * tell something is wrong even though the cron returns gracefully.
 */

import { reddit } from '@devvit/web/server';
import type { AppConfig } from '../shared/types';
import { parseConfig } from './config';

export const WIKI_PAGE = 'botconfig/contextmod';

export type LoadResult =
  | { ok: true; revisionId: string; config: AppConfig }
  | { ok: false; reason: 'not-found' | 'unreachable' | 'parse-failed'; details?: unknown };

// X4: heuristic for distinguishing not-found (legit pre-install state) from
// unreachable (network blip — mod should retry). Reddit API throws different
// error shapes for each, but they're not stable across Devvit versions.
// Conservative heuristic: 404-shaped → not-found; everything else → unreachable.
function isNotFoundError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return msg.includes('not found') || msg.includes('404') || msg.includes('does not exist') || msg.includes('no such page');
}

export async function loadFromWiki(subredditName: string): Promise<LoadResult> {
  let page;
  try {
    page = await reddit.getWikiPage(subredditName, WIKI_PAGE);
  } catch (err) {
    if (isNotFoundError(err)) {
      console.warn(`[cm/configSource] wiki page not found: ${subredditName}/${WIKI_PAGE}`);
      return { ok: false, reason: 'not-found', details: err };
    }
    console.error(`[cm/configSource] wiki page UNREACHABLE (network/auth failure): ${subredditName}/${WIKI_PAGE}:`, err);
    return { ok: false, reason: 'unreachable', details: err };
  }

  const parsed = parseConfig(page.content);
  if (!parsed.ok) {
    console.error('[cm/configSource] AJV/JSON5 errors:', parsed.errors);
    return { ok: false, reason: 'parse-failed', details: parsed.errors };
  }

  return { ok: true, revisionId: page.revisionId, config: parsed.config };
}
