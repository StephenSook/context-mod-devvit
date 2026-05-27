/**
 * Config-editor route group, mounted at /api/config (Task 3).
 *
 * GET /raw: returns the current wiki page content + revisionId so the
 *           editor client can seed its CodeMirror buffer. On a fresh sub
 *           with no wiki page yet, returns the default YAML template so
 *           the mod starts from something valid rather than a blank slate.
 *           Auth-gated: mods only.
 *
 * Later tasks will add /validate, /simulate-live, /explain, /save to this
 * same sub-app.
 */

import { Hono } from 'hono';
import { reddit, redis } from '@devvit/web/server';
import { WIKI_PAGE } from '../core/configSource';
import { requireModerator } from '../lib/requireModerator';
import { DEFAULT_CONFIG_YAML } from '../config/default-config';
import { log } from '../lib/log';
import { parseConfig } from '../core/config';
import { getRecentSample } from '../core/recentSample';
import { simulateRule } from '../core/simulateRule';
import { checkRateLimit } from '../lib/ratelimit';
import { explainRule } from '../core/explainRule';
import { resolveOpenaiKey } from '../lib/resolveOpenaiKey';
import { publish } from '../state/configStore';
import { K } from '../state/keys';
import { logModActivity } from '../state/modActivity';

export const configEditor = new Hono();

function isNotFound(err: unknown): boolean {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return m.includes('not found') || m.includes('404') || m.includes('does not exist') || m.includes('no such page');
}

configEditor.get('/raw', async (c) => {
  const auth = await requireModerator();
  if (!auth.ok) return c.json({ error: auth.error }, auth.status);
  try {
    const page = await reddit.getWikiPage(auth.sub, WIKI_PAGE);
    return c.json({ content: page.content, revisionId: page.revisionId, isDefaultTemplate: false });
  } catch (err) {
    if (isNotFound(err)) {
      return c.json({ content: DEFAULT_CONFIG_YAML, revisionId: null, isDefaultTemplate: true });
    }
    const msg = err instanceof Error ? err.message : String(err);
    log.error('cm/api/config/raw', 'wiki read failed', { err: msg, sub: auth.sub });
    return c.json({ error: `wiki unavailable: ${msg}` }, 503);
  }
});

configEditor.post('/validate', async (c) => {
  const auth = await requireModerator();
  if (!auth.ok) return c.json({ ok: false, error: auth.error }, auth.status);
  const { text } = await c.req.json<{ text?: string }>();
  if (typeof text !== 'string') return c.json({ ok: false, error: 'text required' }, 400);
  const parsed = parseConfig(text);
  if (parsed.ok) return c.json({ ok: true, format: parsed.format });
  return c.json({ ok: false, errors: parsed.errors });
});

configEditor.post('/simulate-live', async (c) => {
  const auth = await requireModerator();
  if (!auth.ok) return c.json({ ok: false, error: auth.error }, auth.status);
  const { text } = await c.req.json<{ text?: string }>();
  if (typeof text !== 'string' || text.length > 100_000) {
    return c.json({ ok: false, error: 'text required (max 100KB)' }, 400);
  }
  const rl = await checkRateLimit('simulate-live', auth.sub, 120, 60);
  if (!rl.allowed) return c.json({ ok: false, error: 'Slow down a moment, then keep editing.' }, 429);
  let result;
  try {
    const samples = await getRecentSample(auth.sub);
    result = await simulateRule(text, samples, auth.sub);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ ok: false, error: `Simulation unavailable: ${msg}` }, 503);
  }
  return c.json(result);
});

configEditor.post('/explain', async (c) => {
  const auth = await requireModerator();
  if (!auth.ok) return c.json({ ok: false, error: auth.error }, auth.status);
  const { text } = await c.req.json<{ text?: string }>();
  if (typeof text !== 'string' || text.length > 100_000) {
    return c.json({ ok: false, error: 'text required (max 100KB)' }, 400);
  }
  // TODO: per-sub circuit breaker (v2); per-user cap is the v1 cost gate.
  const rl = await checkRateLimit('explain', `${auth.sub}:${auth.username}`, 10, 3600);
  if (rl.degraded) return c.json({ ok: false, error: 'Rate-limit subsystem degraded. Retry in ~60s.' }, 503);
  if (!rl.allowed) return c.json({ ok: false, error: `Your limit: ${rl.count}/${rl.max} this hour.` }, 429);
  try {
    const apiKey = await resolveOpenaiKey(auth.sub);
    if (!apiKey) return c.json({ ok: false, error: 'No OpenAI key set. Use the "Set OpenAI API key" mod menu.' }, 400);
    const result = await explainRule(text, apiKey);
    if (!result.ok) return c.json({ ok: false, error: result.error }, 500);
    return c.json({ ok: true, explanation: result.value });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ ok: false, error: `Explain unavailable: ${msg}` }, 503);
  }
});

configEditor.post('/save', async (c) => {
  const auth = await requireModerator();
  if (!auth.ok) return c.json({ ok: false, error: auth.error }, auth.status);

  const { text, baseRevisionId } = await c.req.json<{
    text?: string;
    baseRevisionId?: string | null;
  }>();
  if (typeof text !== 'string' || text.length > 100_000) {
    return c.json({ ok: false, error: 'text required (max 100KB)' }, 400);
  }

  // Gate 1: never write an invalid config to the live moderation wiki.
  const parsed = parseConfig(text);
  if (!parsed.ok) return c.json({ ok: false, error: 'config invalid', errors: parsed.errors }, 400);

  // Gate 2: optimistic lock. Re-read the current wiki rev; if it moved since
  // the editor loaded, refuse so we never silently clobber a concurrent edit.
  try {
    const current = await reddit.getWikiPage(auth.sub, WIKI_PAGE);
    if (baseRevisionId && current.revisionId !== baseRevisionId) {
      return c.json(
        {
          ok: false,
          error: 'The wiki changed since you opened the editor. Reload to merge.',
          conflict: true,
        },
        409
      );
    }
  } catch (err) {
    if (!isNotFound(err)) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return c.json({ ok: false, error: `Could not verify current wiki state: ${errMsg}` }, 503);
    }
    // not-found means the wiki page does not exist yet; allow the first-ever create.
  }

  let written;
  try {
    written = await reddit.updateWikiPage({
      subredditName: auth.sub,
      page: WIKI_PAGE,
      content: text,
      reason: `Edited via ContextMod Observatory by u/${auth.username}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('cm/api/config/save', 'updateWikiPage failed', { err: msg, sub: auth.sub });
    return c.json({ ok: false, error: `Wiki write failed: ${msg}` }, 502);
  }

  const rev = await publish(parsed.config, auth.sub);

  // stamp the new wiki rev so the 5-min cron does not re-publish an identical config (best-effort).
  try {
    if (written?.revisionId) await redis.set(K.cfgLastWikiRev(auth.sub), written.revisionId);
  } catch {
    /* stamping is best-effort; the cron self-heals next tick */
  }

  const ruleCount = parsed.config.runs
    .flatMap((r) => r.checks)
    .flatMap((ch) => ch.rules).length;

  await logModActivity(auth.sub, {
    ts: Date.now(),
    actor: auth.username,
    kind: 'edit-config',
    detail: `${ruleCount} rules @ rev ${rev}`,
  });

  return c.json({ ok: true, rev, ruleCount });
});
