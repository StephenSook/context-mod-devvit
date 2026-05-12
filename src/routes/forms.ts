/**
 * Form submit handlers for ContextMod.
 *
 * STUBS for Phase 0. The only form currently declared in devvit.json is
 * testRules (the dry-run rule tester result form), Phase 3 Task 32.
 */

import { Hono } from 'hono';

export const forms = new Hono();

forms.post('/test-rules-submit', async (c) => {
  console.log(`[cm/forms/test-rules-submit] submitted`);
  // TODO Phase 3 Task 32: handle dry-run form submit
  return c.json({ showToast: 'Form submit — Phase 3' });
});
