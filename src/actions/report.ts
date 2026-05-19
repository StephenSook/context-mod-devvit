/**
 * Report action. reddit.report() takes the Post/Comment model, not the ID, so we
 * resolve via getPostById / getCommentById based on the ID prefix.
 */

import { reddit } from '@devvit/web/server';
import type { ReportAction, ActionContext } from '../shared/types';
import { isPostId } from '../shared/types';

export async function runReport(action: ReportAction, ctx: ActionContext): Promise<void> {
  // Polish #81: ThingId brand + isPostId narrowing predicate — casts dropped.
  const id = ctx.item.id;
  const thing = isPostId(id)
    ? await reddit.getPostById(id)
    : await reddit.getCommentById(id);
  await reddit.report(thing, { reason: action.reason });
}
