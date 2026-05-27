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
import { reddit } from '@devvit/web/server';
import { WIKI_PAGE } from '../core/configSource';
import { requireModerator } from '../lib/requireModerator';
import { DEFAULT_CONFIG_YAML } from '../config/default-config';
import { log } from '../lib/log';
import { parseConfig } from '../core/config';

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
