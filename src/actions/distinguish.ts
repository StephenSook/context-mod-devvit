/**
 * AE Pull-Forward — distinguish action.
 *
 * Marks the target post or comment as moderator-distinguished (the green [M]
 * tag on Reddit). Most commonly paired with a `comment` action so the bot's
 * reply visibly reads as a mod action instead of a regular user post.
 *
 * Devvit API note (verified vs node_modules/@devvit/public-api types):
 *   - `Post.distinguish()` — 0 args, distinguish-only (no sticky concept at
 *     the post level on Reddit's API)
 *   - `Comment.distinguish(makeSticky?: boolean)` — sticky pins the bot's
 *     reply to the top of its thread (the most-common use case)
 *
 * The `sticky` field in DistinguishAction maps to the Comment API's
 * positional `makeSticky` and is ignored on Post targets.
 *
 * Same dispatch shape as `lock` action: detect post vs comment by ID prefix.
 */

import { reddit } from '@devvit/web/server';
import type { DistinguishAction, ActionContext } from '../shared/types';

export async function runDistinguish(
  action: DistinguishAction,
  ctx: ActionContext
): Promise<void> {
  const id = ctx.item.id;
  if (id.startsWith('t3_')) {
    const post = await reddit.getPostById(id as `t3_${string}`);
    await post.distinguish();
  } else if (id.startsWith('t1_')) {
    const comment = await reddit.getCommentById(id as `t1_${string}`);
    const sticky = action.sticky ?? false;
    await comment.distinguish(sticky);
  } else {
    throw new Error(`distinguish: unexpected id prefix ${id}`);
  }
}
