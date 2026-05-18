/**
 * Ban-user action. Per Reddit's API semantics, OMITTING `duration` = permanent ban;
 * setting `duration` (in days) = temporary. We pass `duration` only when the config
 * explicitly sets it — the plan's "duration: 0 = permanent" is incorrect against
 * the actual Reddit API behavior (0 days would be a same-day unban).
 *
 * exactOptionalPropertyTypes: optional fields can't be `undefined` literal — must
 * omit the key entirely when the config didn't set it.
 */

import { reddit } from '@devvit/web/server';
import type { BanUserOptions } from '@devvit/reddit';
import type { BanAction, ActionContext } from '../shared/types';

export async function runBan(
  action: BanAction,
  ctx: ActionContext
): Promise<void> {
  const opts: BanUserOptions = {
    username: ctx.author.name,
    subredditName: ctx.subredditName,
    context: ctx.item.id,
  };
  if (action.duration != null && action.duration > 0)
    opts.duration = action.duration;
  if (action.reason != null) opts.reason = action.reason;
  if (action.note != null) opts.note = action.note;
  if (action.message != null) opts.message = action.message;
  await reddit.banUser(opts);
}
