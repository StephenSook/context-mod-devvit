/**
 * V2 trigger-payload → strict Item/Author normalizer.
 *
 * Devvit's V2 payload is optional-everywhere; the engine reads strict, fully
 * defaulted shapes. Karma is NOT in the UserV2 payload, so we enrich via
 * `reddit.getUserByUsername(name)` — but only if the current config has at
 * least one rule that references Author fields (Council fix, Software Lead +
 * Contrarian: unbounded fan-out on busy subs otherwise).
 *
 * Reality-correction 2026-05-15: Devvit payload field is `author.name`, NOT
 * `author.username`. See `src/routes/triggers.ts:20-23` for the shipped shape.
 */

import { reddit } from '@devvit/web/server';
import type { Item, Author, AppConfig } from './types';
import { escapeMarkdown } from '../core/template';

// Local payload shapes — `OnPostSubmitRequest` / `OnCommentSubmitRequest` are
// NOT re-exported by `@devvit/web/server`; they live in `@devvit/shared/types`
// and the barrel does not re-export shared. Define locally instead.
export interface PostSubmitPayload {
  post?: {
    id?: string;
    title?: string;
    selftext?: string;
    url?: string;
    authorId?: string;
    score?: number;
    nsfw?: boolean;
    spoiler?: boolean;
    locked?: boolean;
    stickied?: boolean;
    createdAt?: number | string;
    linkFlair?: { text?: string };
    isSelf?: boolean;
  };
  author?: { id?: string; name?: string };
  subreddit?: { name?: string };
}

export interface CommentSubmitPayload {
  comment?: {
    id?: string;
    body?: string;
    parentId?: string;
    createdAt?: number | string;
    score?: number;
  };
  post?: { id?: string };
  author?: { id?: string; name?: string };
  subreddit?: { name?: string };
}

// ---------------------------------------------------------------------------
// Item-side defaults
// ---------------------------------------------------------------------------

const ITEM_DEFAULTS: Omit<Item, 'id'> = {
  title: '',
  body: '',
  url: '',
  author: '',
  age: 0,
  score: 0,
  isSelf: false,
  over18: false,
  removed: false,
  approved: false,
  locked: false,
  stickied: false,
  linkFlairText: null,
};

function ageSeconds(createdAt: number | string | undefined): number {
  if (createdAt == null) return 0;
  const ms = typeof createdAt === 'number' ? createdAt : Date.parse(createdAt);
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.floor((Date.now() - ms) / 1000));
}

// ---------------------------------------------------------------------------
// Author enrichment
// ---------------------------------------------------------------------------

const AUTHOR_DEFAULTS: Omit<Author, 'name' | 'id'> = {
  age: 0,
  linkKarma: 0,
  commentKarma: 0,
  flairText: null,
  isMod: false,
  isContributor: false,
  verified: false,
  shadowBanned: false,
};

async function enrichAuthor(
  name: string,
  id: string,
  needsEnrichment: boolean,
): Promise<Author> {
  if (!needsEnrichment || !name) {
    return { ...AUTHOR_DEFAULTS, name, id };
  }
  try {
    const user = await reddit.getUserByUsername(name);
    if (!user) {
      // Deleted / suspended.
      return { ...AUTHOR_DEFAULTS, name, id, shadowBanned: true };
    }
    return {
      name,
      id: id || (user as { id?: string }).id || '',
      age: ageSeconds((user as { createdAt?: Date | number | string }).createdAt as number | string | undefined),
      linkKarma: (user as { linkKarma?: number }).linkKarma ?? 0,
      commentKarma: (user as { commentKarma?: number }).commentKarma ?? 0,
      flairText: null,
      isMod: (user as { isModerator?: boolean }).isModerator ?? false,
      isContributor: false,
      verified: (user as { isAdmin?: boolean }).isAdmin ?? false,
      shadowBanned: false,
    };
  } catch (err) {
    console.warn('[cm/normalize] getUserByUsername failed — defaulting author:', name, err);
    return { ...AUTHOR_DEFAULTS, name, id };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface NormalizedActivity {
  item: Item;
  author: Author;
  /** Pre-escaped variants for safe Mustache rendering (Step 1.4 / Phase 2.5). */
  safe: { authorName: string; itemTitle: string; itemBody: string };
}

/**
 * Inspect the config once to decide whether the per-event normalize must call
 * `reddit.getUserByUsername`. Cached on the config object by Step 1.6 so this
 * runs at publish time, not per-event.
 */
export function computeNeedsAuthorEnrichment(config: AppConfig): boolean {
  for (const run of config.runs ?? []) {
    for (const check of run.checks ?? []) {
      for (const rule of check.rules ?? []) {
        if (ruleNeedsAuthorEnrichment(rule)) return true;
      }
    }
  }
  // Filter side too — checks may include author filters even if no rule does.
  for (const run of config.runs ?? []) {
    for (const check of run.checks ?? []) {
      if (check.filters?.authorIs) {
        const f = check.filters.authorIs;
        if (
          f.ageMinSec != null || f.ageMaxSec != null ||
          f.linkKarmaMin != null || f.linkKarmaMax != null ||
          f.commentKarmaMin != null || f.commentKarmaMax != null ||
          f.isMod != null || f.isContributor != null ||
          f.verified != null || f.shadowBanned != null
        ) return true;
      }
    }
  }
  return false;
}

function ruleNeedsAuthorEnrichment(rule: { kind: string; filter?: unknown; rules?: unknown }): boolean {
  if (rule.kind === 'author' && rule.filter) {
    const f = rule.filter as Record<string, unknown>;
    return (
      f.ageMinSec != null || f.ageMaxSec != null ||
      f.linkKarmaMin != null || f.linkKarmaMax != null ||
      f.commentKarmaMin != null || f.commentKarmaMax != null ||
      f.isMod != null || f.isContributor != null ||
      f.verified != null || f.shadowBanned != null
    );
  }
  if (rule.kind === 'ruleset' && Array.isArray(rule.rules)) {
    return (rule.rules as { kind: string; filter?: unknown; rules?: unknown }[])
      .some(ruleNeedsAuthorEnrichment);
  }
  return false;
}

export async function normalizePost(
  payload: PostSubmitPayload,
  config: AppConfig,
): Promise<NormalizedActivity> {
  const p = payload.post ?? {};
  const a = payload.author ?? {};
  const authorName = a.name ?? '';
  const author = await enrichAuthor(
    authorName,
    a.id ?? p.authorId ?? '',
    config.needsAuthorEnrichment ?? false,
  );
  const item: Item = {
    ...ITEM_DEFAULTS,
    id: p.id ?? '',
    title: p.title ?? '',
    body: p.selftext ?? '',
    url: p.url ?? '',
    author: authorName,
    age: ageSeconds(p.createdAt),
    score: p.score ?? 0,
    isSelf: p.isSelf ?? false,
    over18: p.nsfw ?? false,
    locked: p.locked ?? false,
    stickied: p.stickied ?? false,
    linkFlairText: p.linkFlair?.text ?? null,
  };
  return {
    item,
    author,
    safe: {
      authorName: escapeMarkdown(author.name),
      itemTitle: escapeMarkdown(item.title),
      itemBody: escapeMarkdown(item.body),
    },
  };
}

export async function normalizeComment(
  payload: CommentSubmitPayload,
  config: AppConfig,
): Promise<NormalizedActivity> {
  const c = payload.comment ?? {};
  const a = payload.author ?? {};
  const authorName = a.name ?? '';
  const author = await enrichAuthor(
    authorName,
    a.id ?? '',
    config.needsAuthorEnrichment ?? false,
  );
  const item: Item = {
    ...ITEM_DEFAULTS,
    id: c.id ?? '',
    title: '',
    body: c.body ?? '',
    url: '',
    author: authorName,
    age: ageSeconds(c.createdAt),
    score: c.score ?? 0,
  };
  return {
    item,
    author,
    safe: {
      authorName: escapeMarkdown(author.name),
      itemTitle: '',
      itemBody: escapeMarkdown(item.body),
    },
  };
}
