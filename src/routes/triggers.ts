/**
 * Trigger handlers for ContextMod.
 *
 * STUBS for Phase 0 — every handler ALWAYS returns 200 to avoid blocking install/runtime.
 * Errors logged but never thrown back to Devvit. Real implementations land in Phase 1+2.
 */

import { Hono } from 'hono';
import type { TriggerResponse } from '@devvit/web/shared';
import { firstSeen } from '../lib/idem';

export const triggers = new Hono();

// Generic wrapper: try the handler body, log errors, always return success.
async function safeHandle(
  c: any,
  name: string,
  body: (evt: any) => Promise<void>
): Promise<Response> {
  try {
    const evt = await c.req.json();
    console.log(`[cm/triggers/${name}] payload keys=${Object.keys(evt).join(',')}`);
    await body(evt);
  } catch (err) {
    console.error(`[cm/triggers/${name}] handler error:`, err);
  }
  return c.json({ status: 'success' } as TriggerResponse, 200);
}

triggers.post('/app-install', async (c) =>
  safeHandle(c, 'app-install', async (evt) => {
    const subName = evt?.subreddit?.name ?? 'unknown';
    console.log(`[cm/triggers/app-install] sub=${subName}`);
    // Try idempotency but don't fail install if redis errors
    try {
      await firstSeen(`install:${subName}`);
    } catch (e) {
      console.error('[cm/triggers/app-install] firstSeen failed:', e);
    }
    // TODO Phase 3 Task 27: seed default config to cfg:current
  })
);

triggers.post('/app-upgrade', async (c) =>
  safeHandle(c, 'app-upgrade', async (evt) => {
    const subName = evt?.subreddit?.name ?? 'unknown';
    console.log(`[cm/triggers/app-upgrade] sub=${subName}`);
    // TODO Phase 3 Task 31: run Redis schema migrations
  })
);

triggers.post('/post-submit', async (c) =>
  safeHandle(c, 'post-submit', async (evt) => {
    const postId = evt?.post?.id ?? '';
    if (!postId) return;
    try {
      if (!(await firstSeen(postId))) {
        console.log(`[cm/triggers/post-submit] duplicate delivery for ${postId}`);
        return;
      }
    } catch (e) {
      console.error('[cm/triggers/post-submit] firstSeen failed:', e);
    }
    console.log(`[cm/triggers/post-submit] new post ${postId} by ${evt?.author?.name}`);
    // TODO Phase 2 Task 25: load cfg:current, run handleActivity pipeline
  })
);

triggers.post('/comment-submit', async (c) =>
  safeHandle(c, 'comment-submit', async (evt) => {
    const commentId = evt?.comment?.id ?? '';
    if (!commentId) return;
    try {
      if (!(await firstSeen(commentId))) {
        console.log(`[cm/triggers/comment-submit] duplicate delivery for ${commentId}`);
        return;
      }
    } catch (e) {
      console.error('[cm/triggers/comment-submit] firstSeen failed:', e);
    }
    console.log(`[cm/triggers/comment-submit] new comment ${commentId} by ${evt?.author?.name}`);
    // TODO Phase 2 Task 26: load cfg:current, run handleActivity pipeline
  })
);
