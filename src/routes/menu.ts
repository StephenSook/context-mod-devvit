/**
 * Mod menu handlers for ContextMod.
 *
 * /reload-config: re-reads `r/<sub>/wiki/botconfig/contextmod` and republishes
 *                 (Step 3.4). Same logic as the 5-min cron, on demand. Returns
 *                 a toast with the rule count so the mod has immediate feedback.
 * /recent-actions: creates/navigates to the Observatory custom post.
 * /test-rules: stub for Phase 3 Task 32 (dry-run rule tester form).
 */

import { Hono } from 'hono';
import type { MenuItemRequest } from '@devvit/web/shared';
import { reddit, redis } from '@devvit/web/server';
import * as configStore from '../state/configStore';
import { loadFromWiki, WIKI_PAGE } from '../core/configSource';
import { K } from '../state/keys';
import { logModActivity, type ModActivityKind } from '../state/modActivity';

async function logMenuAction(kind: ModActivityKind, detail?: string): Promise<void> {
  try {
    const [sub, user] = await Promise.all([
      reddit.getCurrentSubreddit(),
      reddit.getCurrentUser(),
    ]);
    await logModActivity(sub?.name, {
      ts: Date.now(),
      actor: user?.username ?? 'unknown',
      kind,
      ...(detail ? { detail } : {}),
    });
  } catch {
    // best-effort, never blocks the menu action
  }
}

export const menu = new Hono();

menu.post('/reload-config', async (c) => {
  await c.req.json<MenuItemRequest>();
  let subName: string;
  try {
    subName = (await reddit.getCurrentSubreddit()).name;
  } catch (err) {
    console.error('[cm/menu/reload-config] could not resolve current sub:', err);
    return c.json({ showToast: 'Could not resolve current subreddit — try again.' });
  }

  const loaded = await loadFromWiki(subName);
  if (!loaded.ok) {
    const msg = loaded.reason === 'not-found'
      ? `Wiki page "${WIKI_PAGE}" not found in r/${subName}. Create it first, then retry.`
      : `Config parse failed — check the wiki page for JSON5/schema errors.`;
    return c.json({ showToast: msg });
  }

  try {
    const rev = await configStore.publish(loaded.config, subName);
    await redis.set(K.cfgLastWikiRev(subName), loaded.revisionId);
    const ruleCount = loaded.config.runs
      .flatMap((r) => r.checks)
      .flatMap((ch) => ch.rules).length;
    console.log(`[cm/menu/reload-config] published rev=${rev} (wiki=${loaded.revisionId}) sub=${subName}`);
    await logMenuAction('reload-config', `${ruleCount} rules @ rev ${rev}`);
    return c.json({ showToast: `Loaded ${ruleCount} rules (rev ${rev}).` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cm/menu/reload-config] publish failed:', err);
    return c.json({ showToast: `Publish failed: ${msg}` });
  }
});

menu.post('/recent-actions', async (c) => {
  try {
    await c.req.json<MenuItemRequest>();
    console.log(`[cm/menu/recent-actions] creating Observatory post`);
    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitCustomPost({
      subredditName: subreddit.name,
      title: 'ContextMod Observatory',
      entry: 'default',
      textFallback: {
        text:
          'ContextMod Observatory — recent rule firings and mod-action telemetry. ' +
          'Open this post in a Devvit-compatible Reddit client to view the dashboard.',
      },
    });
    console.log(`[cm/menu/recent-actions] post created ${post.id}`);
    await logMenuAction('recent-actions');
    return c.json({
      navigateTo: `https://reddit.com${post.permalink}`,
      showToast: 'Observatory dashboard pinned',
    });
  } catch (err) {
    // Surface real error class to the mod so they have something actionable.
    // Mods cannot read Devvit server logs, so "check logs" is useless to them.
    const msg = err instanceof Error ? err.message : String(err);
    const name = err instanceof Error ? err.name : 'Error';
    console.error(`[cm/menu/recent-actions] failed:`, name, msg, err);

    let toast = `Could not create dashboard post: ${msg}`;
    if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('scope')) {
      toast = 'App is missing the submit-post permission. Reinstall or contact app author.';
    } else if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('429')) {
      toast = 'Reddit rate-limited us. Try again in 60 seconds.';
    }
    return c.json({ showToast: toast });
  }
});

menu.post('/set-openai-key', async (c) => {
  await c.req.json<MenuItemRequest>();
  return c.json({
    showForm: {
      name: 'setOpenaiKey',
      form: {
        title: 'ContextMod — Set OpenAI API key',
        description:
          'Stored in this sub\'s Redis (encrypted at rest). Required for "Explain a rule with AI" + "Explain with AI" on event drill-down. Get a key at platform.openai.com/api-keys. ~$0.0001 per call (gpt-4o-mini).',
        fields: [
          {
            type: 'string',
            name: 'apiKey',
            label: 'OpenAI API key (sk-...)',
            helpText: 'Paste your sk-proj-... key. Not echoed back after save.',
          },
        ],
        acceptLabel: 'Save key',
        cancelLabel: 'Cancel',
      },
    },
  });
});

menu.post('/explain-rule', async (c) => {
  await c.req.json<MenuItemRequest>();
  return c.json({
    showForm: {
      name: 'explainRule',
      form: {
        title: 'ContextMod — Explain a rule with AI',
        description:
          'Paste a rule JSON5. OpenAI returns a plain-English explanation. Requires the openai_api_key app setting to be configured.',
        fields: [
          {
            type: 'paragraph',
            name: 'ruleJson5',
            label: 'Rule JSON5',
            helpText:
              "Example: {kind: 'regex', name: 'r1', pattern: 'crypto|nft', target: 'title'}",
          },
        ],
        acceptLabel: 'Explain',
        cancelLabel: 'Cancel',
      },
    },
  });
});

menu.post('/simulate-rule', async (c) => {
  await c.req.json<MenuItemRequest>();
  return c.json({
    showForm: {
      name: 'simulateRule',
      form: {
        title: 'ContextMod — Simulate rule against history',
        description:
          'Paste a rule JSON5. The simulation runs your proposed rule against the last 25 posts in this sub and reports how often it would have fired. Zero Reddit side-effects.',
        fields: [
          {
            type: 'paragraph',
            name: 'ruleJson5',
            label: 'Rule JSON5',
            helpText:
              "Example: {kind: 'regex', name: 'r1', pattern: 'crypto|nft', target: 'title'}",
          },
        ],
        acceptLabel: 'Run simulation',
        cancelLabel: 'Cancel',
      },
    },
  });
});

menu.post('/test-rules', async (c) => {
  const evt = await c.req.json<MenuItemRequest>();
  console.log(`[cm/menu/test-rules] targetId=${evt.targetId}`);
  if (!evt.targetId) {
    return c.json({
      showToast: 'Right-click a post or comment to select it, then re-open this menu to test rules.',
    });
  }
  return c.json({
    showForm: {
      name: 'testRules',
      form: {
        title: 'ContextMod — Dry-run rules',
        description: 'Evaluate the live rule set against this item. No Reddit actions will fire.',
        fields: [
          {
            type: 'string',
            name: 'thingId',
            label: 'Thing ID',
            defaultValue: evt.targetId,
            // NB: cannot set `disabled: true` here — Devvit/HTML spec drops
            // disabled fields from form submission, so the handler would
            // receive thingId=undefined. Live-playtest 2026-05-16 hit this.
            // Field stays editable so the value actually arrives at the
            // submit handler; mods can technically edit but the menu only
            // exposes this on a specific post/comment context so the
            // pre-filled value is the mod's intent in practice.
          },
        ],
        acceptLabel: 'Run dry-run',
        cancelLabel: 'Cancel',
      },
    },
  });
});
