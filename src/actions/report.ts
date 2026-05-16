/**
 * Report action. reddit.report() takes the Post/Comment model, not the ID, so we
 * resolve via getPostById / getCommentById based on the ID prefix.
 */

import { reddit } from '@devvit/web/server';
import type { ReportAction, ActionContext } from '../shared/types';

export async function runReport(action: ReportAction, ctx: ActionContext): Promise<void> {
  const id = ctx.item.id;
  const thing = id.startsWith('t3_')
    ? await reddit.getPostById(id as `t3_${string}`)
    : await reddit.getCommentById(id as `t1_${string}`);
  await reddit.report(thing, { reason: action.reason });
}
