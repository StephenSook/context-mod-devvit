/**
 * Comment-reply action. Renders the Mustache template against the item/author
 * context, then posts as the app via reddit.submitComment.
 *
 * The template MUST reference `{{author.nameSafe}}`, `{{item.titleSafe}}`,
 * `{{item.bodySafe}}` for any user-controlled field — see template.ts:33 for
 * the rationale (markdown injection: ping-storms, fake mod quotes, deceptive
 * links). The Safe variants are populated by normalize.ts.
 */

import { reddit } from '@devvit/web/server';
import type { CommentAction, ActionContext } from '../shared/types';
import { render, type TemplateContext } from '../core/template';
import { escapeMarkdown } from '../core/template';

export async function runComment(action: CommentAction, ctx: ActionContext): Promise<void> {
  const tplCtx: TemplateContext = {
    item: {
      ...ctx.item,
      titleSafe: escapeMarkdown(ctx.item.title),
      bodySafe: escapeMarkdown(ctx.item.body),
    },
    author: {
      ...ctx.author,
      nameSafe: escapeMarkdown(ctx.author.name),
    },
  };
  const text = render(action.template, tplCtx);
  await reddit.submitComment({ id: ctx.item.id as `t3_${string}` | `t1_${string}`, text });
}
