/**
 * Set-user-flair action. Similar exactOptionalPropertyTypes treatment as ban.ts
 * — `text` and `cssClass` are optional in our config; omit when unset rather
 * than passing `undefined` literals.
 */

import { reddit } from '@devvit/web/server';
import type { SetUserFlairOptions } from '@devvit/reddit';
import type { UserFlairAction, ActionContext } from '../shared/types';

export async function runUserFlair(action: UserFlairAction, ctx: ActionContext): Promise<void> {
  const opts: SetUserFlairOptions = {
    subredditName: ctx.subredditName,
    username: ctx.author.name,
  };
  if (action.text != null) opts.text = action.text;
  if (action.cssClass != null) opts.cssClass = action.cssClass;
  await reddit.setUserFlair(opts);
}
