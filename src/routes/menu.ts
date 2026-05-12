/**
 * Mod menu handlers for ContextMod.
 *
 * STUBS for Phase 0 — return user-visible toasts so playtest UX works.
 * Real implementations:
 *   - /reload-config: Phase 3 Task 28
 *   - /recent-actions: Phase 3 Task 29-30
 *   - /test-rules: Phase 3 Task 32
 */

import { Hono } from 'hono';
import type { MenuItemRequest } from '@devvit/web/shared';

export const menu = new Hono();

menu.post('/reload-config', async (c) => {
  await c.req.json<MenuItemRequest>();
  console.log(`[cm/menu/reload-config] triggered`);
  // TODO Phase 3 Task 28: call loadFromSource(), show count of rules
  return c.json({ showToast: 'Config reload — not yet implemented (Phase 3)' });
});

menu.post('/recent-actions', async (c) => {
  await c.req.json<MenuItemRequest>();
  console.log(`[cm/menu/recent-actions] triggered`);
  // TODO Phase 3 Task 30: pin or navigate to the dashboard custom post
  return c.json({ showToast: 'Recent actions dashboard — Phase 3' });
});

menu.post('/test-rules', async (c) => {
  const evt = await c.req.json<MenuItemRequest>();
  console.log(`[cm/menu/test-rules] targetId=${evt.targetId}`);
  // TODO Phase 3 Task 32: dry-run pipeline against the target, show UiResponse.showForm
  return c.json({ showToast: 'Dry-run rule tester — Phase 3' });
});
