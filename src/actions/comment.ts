/**
 * Comment-reply action. Renders the Mustache template against the item/author
 * context, then posts as the app via reddit.submitComment.
 *
 * Codex H4 2026-05-16 hardening: Mustache.escape now defaults to escapeMarkdown
 * (template.ts:18). Both `{{author.name}}` and `{{author.nameSafe}}` render
 * identically — single escape via render-time pass. The `*Safe` fields remain
 * exposed as aliases so older configs that explicitly reference them keep
 * working. Mods who want truly raw content use Mustache triple-stash
 * `{{{author.name}}}` (explicit bypass).
 */

import { reddit } from '@devvit/web/server';
import type { CommentAction, ActionContext } from '../shared/types';
import { render, type TemplateContext } from '../core/template';

export async function runComment(action: CommentAction, ctx: ActionContext): Promise<void> {
  // Safe fields are now aliases to raw — render-time escape (render-time defang)
  // produces the single-pass escape they used to need pre-rendering.
  const tplCtx: TemplateContext = {
    item: {
      ...ctx.item,
      titleSafe: ctx.item.title,
      bodySafe: ctx.item.body,
    },
    author: {
      ...ctx.author,
      nameSafe: ctx.author.name,
    },
  };
  const text = render(action.template, tplCtx);
  await reddit.submitComment({
    id: ctx.item.id as `t3_${string}` | `t1_${string}`,
    text,
  });
}
