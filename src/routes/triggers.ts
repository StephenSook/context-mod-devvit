/**
 * Trigger handlers — Phase 2 wiring.
 *
 * /post-submit and /comment-submit normalize the V2 payload and dispatch to
 * `handleActivity`, which reads the published config and runs the full
 * rule → check → run → action pipeline.
 *
 * Guard order (D0.1 skeleton kept verbatim — these are NOT moved into
 * handleActivity because they're trigger-shape-specific):
 *   1. Null-safety — bail if post/comment ID is missing.
 *   2. Recursion guard — don't react to our own posts (reddit.getAppUser may
 *      return undefined; null-check is required per RedditClient.d.ts:371).
 *      Skip the guard (rather than bail) when author.name is missing so a
 *      payload anomaly doesn't kill all trigger work.
 *   3. firstSeen idempotency — 24h NX guard so a Devvit retry doesn't
 *      double-fire. Fail-CLOSED on Redis error (returns false → skip).
 *   4. Normalize the V2 payload + dispatch to handleActivity.
 *
 * Kill switch deferred — Ctrl+C on the playtest terminal IS the kill switch
 * for playtest. Revisit before any `devvit publish --public`.
 */

import { Hono } from 'hono';
import { reddit } from '@devvit/web/server';
import { firstSeen } from '../lib/idem';
import { normalizePost, normalizeComment, type PostSubmitPayload, type CommentSubmitPayload } from '../shared/normalize';
import { handleActivity } from '../core/handleActivity';
import * as configStore from '../state/configStore';
import type { AppConfig } from '../shared/types';

export const triggers = new Hono();

triggers.post('/app-install', (c) => {
  console.log('[cm] app-install fired');
  return c.json({}, 200);
});

triggers.post('/app-upgrade', (c) => {
  console.log('[cm] app-upgrade fired');
  return c.json({}, 200);
});

triggers.post('/post-submit', async (c) => {
  const input = await c.req.json<PostSubmitPayload>();
  const post = input.post;
  if (!post?.id) {
    console.log('[cm/post-submit] null-safety bail (no post.id)');
    return c.json({ status: 'ok' });
  }
  const authorName = input.author?.name;
  if (!authorName) {
    console.warn('[cm/post-submit] author.name missing — recursion guard skipped');
  }

  // Recursion guard. getAppUser() returns User | undefined per
  // node_modules/@devvit/reddit/RedditClient.d.ts:371. If authorName is missing
  // we skip the guard rather than bailing — worst case the bot reacts to its
  // own post on a private test sub.
  if (authorName) {
    const appUser = await reddit.getAppUser();
    if (appUser && authorName === appUser.username) return c.json({ status: 'ok' });
  }

  const subName = input.subreddit?.name ?? (await reddit.getCurrentSubreddit()).name;

  // firstSeen BEFORE normalize so a re-delivered trigger doesn't burn the
  // (potentially expensive) getUserByUsername call when the config needs it.
  const seen = await firstSeen(post.id, subName);
  if (!seen) {
    console.warn('[cm/post-submit] firstSeen=false (already-seen OR Redis fail-closed):', post.id);
    return c.json({ status: 'skipped-already-seen' });
  }

  // Read the config ONCE at the entry point so normalize sees the same rev
  // handleActivity will. needsAuthorEnrichment is decided at publish time.
  const current = await configStore.getCurrentRev(subName);
  const config: AppConfig = current?.config ?? { runs: [], needsAuthorEnrichment: false };
  const { item, author } = await normalizePost(input, config);
  await handleActivity(item, author, subName);

  return c.json({ status: 'ok' });
});

triggers.post('/comment-submit', async (c) => {
  const input = await c.req.json<CommentSubmitPayload>();
  const comment = input.comment;
  if (!comment?.id) {
    console.log('[cm/comment-submit] null-safety bail (no comment.id)');
    return c.json({ status: 'ok' });
  }
  const authorName = input.author?.name;
  if (!authorName) {
    console.warn('[cm/comment-submit] author.name missing — recursion guard skipped');
  }

  if (authorName) {
    const appUser = await reddit.getAppUser();
    if (appUser && authorName === appUser.username) return c.json({ status: 'ok' });
  }

  const subName = input.subreddit?.name ?? (await reddit.getCurrentSubreddit()).name;

  const seen = await firstSeen(comment.id, subName);
  if (!seen) {
    console.warn('[cm/comment-submit] firstSeen=false (already-seen OR Redis fail-closed):', comment.id);
    return c.json({ status: 'skipped-already-seen' });
  }

  const current = await configStore.getCurrentRev(subName);
  const config: AppConfig = current?.config ?? { runs: [], needsAuthorEnrichment: false };
  const { item, author } = await normalizeComment(input, config);
  await handleActivity(item, author, subName);

  return c.json({ status: 'ok' });
});
