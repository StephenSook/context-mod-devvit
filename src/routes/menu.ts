/**
 * Mod menu handlers for ContextMod.
 *
 * /reload-config: Phase 2 PLAYTEST SEED — publishes a minimal hardcoded config
 *                 so the end-to-end pipeline can be verified live. Phase 3 Task 28
 *                 replaces this with the real wiki loader (see Step 3.2 in the plan).
 * /recent-actions: creates/navigates to the Observatory custom post
 * /test-rules: stub for Phase 3 Task 32
 */

import { Hono } from 'hono';
import type { MenuItemRequest } from '@devvit/web/shared';
import { reddit } from '@devvit/web/server';
import * as configStore from '../state/configStore';
import { computeNeedsAuthorEnrichment } from '../shared/normalize';
import type { AppConfig } from '../shared/types';

export const menu = new Hono();

/**
 * Phase 2 playtest config — small enough to verify the full pipeline:
 *   - regex match on title → remove (proves Step 1-2 happy path)
 *   - regex match on title → comment with Mustache template (proves Step 2.5.3 escaper live)
 *   - repost rule (dryRun) → records to events ZSET without removing (proves Step 2.5.2 gate)
 *
 * Hardcoded here so the playtest doesn't depend on a wiki page existing yet.
 * Will be deleted in Phase 3 once /reload-config reads from the sub's wiki.
 */
const PLAYTEST_SEED_CONFIG: AppConfig = {
  dryRun: false,
  runs: [
    {
      name: 'spam-removal',
      checks: [{
        name: 'crypto-giveaway',
        combinator: 'OR',
        rules: [
          { kind: 'regex', name: 'scam-words', pattern: 'scam|giveaway|crypto', flags: 'i' },
        ],
        actions: [
          { kind: 'remove', isSpam: true },
          {
            kind: 'comment',
            template: 'Hi {{author.nameSafe}}, your post "{{item.titleSafe}}" was removed as suspected spam. Mod-team will review on appeal.',
          },
        ],
      }],
    },
    {
      name: 'repost-watch',
      checks: [{
        name: 'url-dedupe',
        combinator: 'OR',
        rules: [{ kind: 'repost', name: 'url-30d', windowDays: 30 }],
        actions: [{ kind: 'remove', dryRun: true }],  // dry-run until mods watch the feed
      }],
    },
  ],
};

menu.post('/reload-config', async (c) => {
  await c.req.json<MenuItemRequest>();
  console.log(`[cm/menu/reload-config] PHASE 2 PLAYTEST SEED triggered`);
  try {
    const sub = await reddit.getCurrentSubreddit();
    const cfg: AppConfig = {
      ...PLAYTEST_SEED_CONFIG,
      needsAuthorEnrichment: computeNeedsAuthorEnrichment(PLAYTEST_SEED_CONFIG),
    };
    const rev = await configStore.publish(cfg, sub.name);
    console.log(`[cm/menu/reload-config] published rev ${rev} to sub ${sub.name}`);
    return c.json({ showToast: `Phase 2 seed config published (rev ${rev}). Submit a post titled "free crypto giveaway" to test.` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[cm/menu/reload-config] failed:`, err);
    return c.json({ showToast: `Seed failed: ${msg}` });
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

menu.post('/test-rules', async (c) => {
  const evt = await c.req.json<MenuItemRequest>();
  console.log(`[cm/menu/test-rules] targetId=${evt.targetId}`);
  // TODO Phase 3 Task 32: dry-run pipeline against the target, show UiResponse.showForm
  return c.json({ showToast: 'Dry-run rule tester — Phase 3' });
});
