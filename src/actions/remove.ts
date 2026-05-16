import { reddit } from '@devvit/web/server';
import type { RemoveAction, ActionContext } from '../shared/types';

export async function runRemove(action: RemoveAction, ctx: ActionContext): Promise<void> {
  await reddit.remove(ctx.item.id as `t3_${string}` | `t1_${string}`, action.isSpam ?? false);
}
