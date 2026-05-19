import { reddit } from '@devvit/web/server';
import type { ApproveAction, ActionContext } from '../shared/types';

export async function runApprove(_action: ApproveAction, ctx: ActionContext): Promise<void> {
  // Polish #81: cast dropped — ctx.item.id is ThingId via shared brand.
  await reddit.approve(ctx.item.id);
}
