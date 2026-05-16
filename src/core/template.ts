/**
 * Mustache renderer for action templates (e.g. comment-action reply text).
 *
 * No HTML escaping — Reddit comments are plaintext/markdown, not HTML. The
 * Mustache default would mangle user-facing apostrophes / ampersands.
 *
 * Markdown injection sanitizer (`escapeMarkdown`) is used by Step 1.3's
 * normalizer to populate the `*Safe` fields on the template context. The
 * comment-reply template README must direct authors to use the `Safe` fields
 * — see Phase 2.5 step 2.5.3 in the plan.
 */

import Mustache from 'mustache';
import type { Item, Author } from '../shared/types';

// Disable HTML escaping globally — Mustache treats this as a mutable side door.
// Reddit comments are markdown, not HTML; default escape would mangle '&' and "'".
Mustache.escape = (s: string) => s;

export interface TemplateContext {
  item: Item & { titleSafe: string; bodySafe: string };
  author: Author & { nameSafe: string };
  manager?: { name?: string };
  rules?: Record<string, unknown>;
  actions?: Record<string, unknown>;
}

export function render(template: string, ctx: TemplateContext): string {
  return Mustache.render(template, ctx);
}

/**
 * Markdown-injection sanitizer (Council 2026-05-14 21:30/23:00, Security + Software Lead).
 *
 * Reddit's renderer interprets markdown live, so user-controlled fields
 * (`author.name`, `item.title`, `item.body`) embedded in a bot's
 * `submitComment` are an XSS-equivalent attack surface: ping-storms
 * (`u/x u/y`), fake mod quotes (`> as a mod, I...`), deceptive
 * `[click](malicious)` links.
 *
 * The general regex escapes every markdown-active char. The `\b` word-boundary
 * is critical for the u/r-pings — `/u\//gi` would mangle `https://youtu.be/...`
 * into `https://yo*u\/*tu.be/...` (false-positive on every YouTube link).
 *
 * Goal: "Reddit renders the link correctly," NOT "string is byte-identical."
 * The escaped `.` in URLs is rendered as a literal dot by Reddit's auto-linker,
 * so URLs still resolve. Mandatory in-playtest renderer verification on the
 * fixture set before relying on this in Phase 2.5.
 */
export function escapeMarkdown(s: string): string {
  if (!s) return s;
  return s
    .replace(/([\\`*_{}[\]()#+\-.!|>])/g, '\\$1')
    .replace(/\bu\//gi, 'u\\/')
    .replace(/\br\//gi, 'r\\/');
}
