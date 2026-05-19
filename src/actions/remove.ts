import { reddit } from '@devvit/web/server';
import type { RemoveAction, ActionContext } from '../shared/types';

export async function runRemove(action: RemoveAction, ctx: ActionContext): Promise<void> {
  // Polish #81: cast dropped — ctx.item.id is the ThingId branded union
  // (`t3_${string}` | `t1_${string}`) via the shared/types.ts brand +
  // normalize.ts construction-site validation. TypeScript now accepts
  // it directly at the reddit.remove() signature without coercion.
  await reddit.remove(ctx.item.id, action.isSpam ?? false);
}
