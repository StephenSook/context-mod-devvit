import { reddit } from '@devvit/web/server';
import type { ApproveAction, ActionContext } from '../shared/types';

export async function runApprove(
  _action: ApproveAction,
  ctx: ActionContext
): Promise<void> {
  await reddit.approve(ctx.item.id as `t3_${string}` | `t1_${string}`);
}
