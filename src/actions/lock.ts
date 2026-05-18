/**
 * Lock action. Not on reddit.* — must go through the Post/Comment models per
 * RedditClient.d.ts. We detect post vs comment by ID prefix.
 */

import { reddit } from '@devvit/web/server';
import type { LockAction, ActionContext } from '../shared/types';

export async function runLock(_action: LockAction, ctx: ActionContext): Promise<void> {
  const id = ctx.item.id;
  if (id.startsWith('t3_')) {
    const post = await reddit.getPostById(id as `t3_${string}`);
    await post.lock();
  } else if (id.startsWith('t1_')) {
    const comment = await reddit.getCommentById(id as `t1_${string}`);
    await comment.lock();
  } else {
    throw new Error(`lock: unexpected id prefix ${id}`);
  }
}
