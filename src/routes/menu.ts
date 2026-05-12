/**
 * Mod menu handlers for ContextMod.
 *
 * /reload-config: stub for Phase 3 Task 28
 * /recent-actions: creates/navigates to the Observatory custom post
 * /test-rules: stub for Phase 3 Task 32
 */

import { Hono } from 'hono';
import type { MenuItemRequest } from '@devvit/web/shared';
import { reddit } from '@devvit/web/server';

export const menu = new Hono();

menu.post('/reload-config', async (c) => {
  await c.req.json<MenuItemRequest>();
  console.log(`[cm/menu/reload-config] triggered`);
  // TODO Phase 3 Task 28: call loadFromSource(), show count of rules
  return c.json({ showToast: 'Config reload — not yet implemented (Phase 3)' });
});

menu.post('/recent-actions', async (c) => {
  try {
    await c.req.json<MenuItemRequest>();
    console.log(`[cm/menu/recent-actions] creating Observatory post`);
    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitCustomPost({
      subredditName: subreddit.name,
      title: 'ContextMod Observatory',
      splash: { appDisplayName: 'ContextMod Observatory' },
    });
    console.log(`[cm/menu/recent-actions] post created ${post.id}`);
    return c.json({
      navigateTo: `https://reddit.com${post.permalink}`,
      showToast: 'Observatory dashboard pinned',
    });
  } catch (err) {
    console.error(`[cm/menu/recent-actions] failed:`, err);
    return c.json({ showToast: 'Could not create dashboard post — check logs' });
  }
});

menu.post('/test-rules', async (c) => {
  const evt = await c.req.json<MenuItemRequest>();
  console.log(`[cm/menu/test-rules] targetId=${evt.targetId}`);
  // TODO Phase 3 Task 32: dry-run pipeline against the target, show UiResponse.showForm
  return c.json({ showToast: 'Dry-run rule tester — Phase 3' });
});
