/**
 * Trigger handlers for ContextMod.
 *
 * STUBS for Phase 0 — return 200 to avoid 404s during playtest plumbing tests.
 * Real implementations land in Phase 1+2 per the implementation plan.
 *
 * Every handler MUST call firstSeen() at the top before any work (per H2).
 */

import { Hono } from 'hono';
import type {
  OnAppInstallRequest,
  OnAppUpgradeRequest,
  OnPostSubmitRequest,
  OnCommentSubmitRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { firstSeen } from '../lib/idem';

export const triggers = new Hono();

triggers.post('/app-install', async (c) => {
  const evt = await c.req.json<OnAppInstallRequest>();
  console.log(`[cm/triggers/app-install] sub=${evt.subreddit?.name}`);
  // Idempotency: app-install can fire twice (Devvit at-least-once).
  // Use subreddit name as the dedupe key.
  if (!(await firstSeen(`install:${evt.subreddit?.name ?? 'unknown'}`))) {
    console.log('[cm/triggers/app-install] duplicate delivery — skipping');
    return c.json<TriggerResponse>({ status: 'success' }, 200);
  }
  // TODO Phase 3 Task 27: seed default config to cfg:current
  return c.json<TriggerResponse>({ status: 'success' }, 200);
});

triggers.post('/app-upgrade', async (c) => {
  const evt = await c.req.json<OnAppUpgradeRequest>();
  console.log(`[cm/triggers/app-upgrade] sub=${evt.subreddit?.name}`);
  // TODO Phase 3 Task 31: run Redis schema migrations
  return c.json<TriggerResponse>({ status: 'success' }, 200);
});

triggers.post('/post-submit', async (c) => {
  const evt = await c.req.json<OnPostSubmitRequest>();
  const postId = evt.post?.id ?? '';
  if (!postId) return c.json<TriggerResponse>({ status: 'success' }, 200);
  if (!(await firstSeen(postId))) {
    console.log(`[cm/triggers/post-submit] duplicate delivery for ${postId}`);
    return c.json<TriggerResponse>({ status: 'success' }, 200);
  }
  console.log(`[cm/triggers/post-submit] new post ${postId} by ${evt.author?.name}`);
  // TODO Phase 2 Task 25: load cfg:current, run handleActivity pipeline
  return c.json<TriggerResponse>({ status: 'success' }, 200);
});

triggers.post('/comment-submit', async (c) => {
  const evt = await c.req.json<OnCommentSubmitRequest>();
  const commentId = evt.comment?.id ?? '';
  if (!commentId) return c.json<TriggerResponse>({ status: 'success' }, 200);
  if (!(await firstSeen(commentId))) {
    console.log(`[cm/triggers/comment-submit] duplicate delivery for ${commentId}`);
    return c.json<TriggerResponse>({ status: 'success' }, 200);
  }
  console.log(`[cm/triggers/comment-submit] new comment ${commentId} by ${evt.author?.name}`);
  // TODO Phase 2 Task 26: load cfg:current, run handleActivity pipeline
  return c.json<TriggerResponse>({ status: 'success' }, 200);
});
