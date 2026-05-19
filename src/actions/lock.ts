/**
 * Lock action. Not on reddit.* — must go through the Post/Comment models per
 * RedditClient.d.ts. We detect post vs comment by ID prefix.
 */

import { reddit } from '@devvit/web/server';
import type { LockAction, ActionContext } from '../shared/types';
import { isPostId } from '../shared/types';

export async function runLock(_action: LockAction, ctx: ActionContext): Promise<void> {
  // Polish #81: ThingId brand + isPostId narrowing predicate. Casts at
  // the getPostById/getCommentById call sites dropped. Pre-Polish the
  // `else throw` branch was the runtime guard against malformed IDs;
  // that guard moved UP to normalize.ts BadTriggerIdError so we hit it
  // at trigger boundary (handleActivity's per-run catch records as
  // run-error), not deep in the action layer.
  const id = ctx.item.id;
  if (isPostId(id)) {
    const post = await reddit.getPostById(id);
    await post.lock();
  } else {
    const comment = await reddit.getCommentById(id);
    await comment.lock();
  }
}
