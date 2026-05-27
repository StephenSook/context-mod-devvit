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
 * `author.username`. See `src/routes/triggers.ts` for the shipped shape.
 */

import { reddit } from '@devvit/web/server';
import type { Item, Author, AppConfig, ThingId } from './types';
import { isThingId } from './types';
import { escapeMarkdown } from '../core/template';

// AE Polish #81: invalid thing-ID throw. Reddit's triggers ALWAYS send
// well-formed t3_/t1_ IDs in production; this throw is the runtime
// guard that pairs with the ThingId brand at the type level. If a
// malformed payload arrives (test harness, partial mock, hypothetical
// Devvit API regression), handleActivity's per-run try/catch records
// it as a (run-error) event instead of silently swallowing into the
// `?? ''` empty-string path that previously routed to actions and
// 400'd far from the source.
export class BadTriggerIdError extends Error {
  constructor(public readonly rawId: string, public readonly kind: 'post' | 'comment') {
    super(`normalize: ${kind} trigger payload has invalid thing-id ${JSON.stringify(rawId)}`);
    this.name = 'BadTriggerIdError';
  }
}

function assertThingId(raw: string, kind: 'post' | 'comment'): ThingId {
  if (!isThingId(raw)) throw new BadTriggerIdError(raw, kind);
  return raw;
}

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
    /**
     * Phase 4.7 — Reddit's preview.redd.it resolutions for image posts. Per
     * Vinh's 0.10 spike, the smallest variant >=320px gives 0-2/256 bit
     * blockhash drift vs full-res at ~5MB peak RAM (vs 180MB for full 4K).
     * preview URLs are Reddit-signed (s=<sig>) so they MUST be read off the
     * trigger payload, not synthesized.
     */
    preview?: {
      images?: {
        resolutions?: { width?: number; height?: number; url?: string }[];
        source?: { width?: number; height?: number; url?: string };
      }[];
    };
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

// Item-side defaults.
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

/**
 * Phase 4.7 — pick the best preview.redd.it variant for blockhashing. Per
 * Vinh's 0.10 spike measurements: the largest variant with width ≤ 640 hits
 * the sweet spot — 0-2/256 bit hash drift vs full-res at <5MB peak RAM.
 * Smaller (320) works too (same fidelity), but 640 gives the decoder more
 * signal for the 16x16 blockhash grid. Returns undefined for non-image posts
 * or posts w/o preview metadata. Falls back to i.redd.it post.url ONLY when
 * the URL itself is an i.redd.it image — never blindly returns post.url
 * because that could be a 4K-JPEG-or-external-URL that bypasses the RAM
 * ceiling.
 */
function pickPreviewVariant(p: NonNullable<PostSubmitPayload['post']>): string | undefined {
  const resolutions = p.preview?.images?.[0]?.resolutions ?? [];
  const fitted = resolutions
    .filter((r): r is { width: number; height: number; url: string } =>
      typeof r?.url === 'string' && typeof r.width === 'number' && r.width > 0
    )
    .sort((a, b) => a.width - b.width);
  // Largest ≤640px. If all are larger, fall back to the smallest available.
  const optimal = fitted.filter((r) => r.width <= 640).pop() ?? fitted[0];
  if (optimal) return optimal.url;
  // Fallback: post.url is an i.redd.it image. Bytes are capped in decode.ts
  // so the worst case for a 4K JPEG is decode-time RAM still bounded.
  const url = p.url ?? '';
  if (/^https:\/\/i\.redd\.it\//i.test(url) && /\.(jpe?g|png)(\?|$)/i.test(url)) {
    return url;
  }
  return undefined;
}

// Author enrichment.

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

/**
 * AE Polish #11 (Agent B #9): Devvit getUserByUsername returns an untyped
 * shape. Previously each field was `(user as { isModerator?: boolean }).isModerator ?? false`
 * which silently defaults to false when the field is missing or renamed.
 * If a future Devvit minor release renames `isModerator → isMod` (or
 * similar), every author silently becomes `isMod:false` + mod-bypass
 * filters stop matching — bot starts removing mods' own posts.
 *
 * extractTypedField() reads the value + logs (warn level, once per
 * enrichment) when the expected field is missing entirely. Same nullable
 * default as before for fail-OPEN behavior, but the log line means ops
 * sees the shape drift before mass mis-moderation lands.
 */
function extractTypedField<T>(
  obj: Record<string, unknown>,
  fieldName: string,
  typeCheck: (v: unknown) => v is T,
  fallback: T,
  missingFields: string[]
): T {
  const v = obj[fieldName];
  if (v === undefined) {
    missingFields.push(fieldName);
    return fallback;
  }
  if (typeCheck(v)) return v;
  // Type mismatch (e.g. string where boolean expected) — log + default.
  missingFields.push(`${fieldName}:wrong-type`);
  return fallback;
}

const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number';
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
const isDateLike = (v: unknown): v is Date | number | string =>
  v instanceof Date || typeof v === 'number' || typeof v === 'string';

/** Coerce a Date | number | string to the number | string shape ageSeconds expects. */
function coerceDateLike(v: Date | number | string): number | string {
  return v instanceof Date ? v.getTime() : v;
}

async function enrichAuthor(name: string, id: string, needsEnrichment: boolean): Promise<Author> {
  if (!needsEnrichment || !name) {
    return { ...AUTHOR_DEFAULTS, name, id };
  }
  try {
    const user = await reddit.getUserByUsername(name);
    if (!user) {
      // Deleted / suspended.
      return { ...AUTHOR_DEFAULTS, name, id, shadowBanned: true };
    }
    const obj = user as unknown as Record<string, unknown>;
    const missing: string[] = [];
    const enriched: Author = {
      name,
      id: id || extractTypedField(obj, 'id', isString, '', missing),
      age: ageSeconds(coerceDateLike(extractTypedField(obj, 'createdAt', isDateLike, 0, missing))),
      linkKarma: extractTypedField(obj, 'linkKarma', isNumber, 0, missing),
      commentKarma: extractTypedField(obj, 'commentKarma', isNumber, 0, missing),
      flairText: null,
      isMod: extractTypedField(obj, 'isModerator', isBoolean, false, missing),
      isContributor: false,
      verified: extractTypedField(obj, 'isAdmin', isBoolean, false, missing),
      shadowBanned: false,
    };
    if (missing.length > 0) {
      // AE Polish #11: log Devvit RPC shape drift. If 'isModerator' goes
      // missing, mods stop matching their own bypass filters — surface this
      // to ops BEFORE the bot starts removing mod posts.
      console.warn(
        '[cm/normalize] getUserByUsername returned w/ missing/wrong-type fields:',
        name,
        missing
      );
    }
    return enriched;
  } catch (err) {
    console.warn(
      '[cm/normalize] getUserByUsername failed — defaulting author + tagging enrichmentFailed:',
      name,
      err
    );
    return { ...AUTHOR_DEFAULTS, name, id, enrichmentFailed: true };
  }
}

// Public API.

/**
 * M1: single source of truth for converting a createdAt value (number | Date | string)
 * to the number | string shape that PostSubmitPayload and CommentSubmitPayload accept.
 * Previously duplicated in recentSample.ts and forms.ts.
 */
export function asPayloadTimestamp(
  t?: number | Date | string
): number | string | undefined {
  if (t == null) return undefined;
  if (typeof t === 'number') return t;
  if (typeof t === 'string') return t;
  return t.getTime();
}

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
          f.ageMinSec != null ||
          f.ageMaxSec != null ||
          f.linkKarmaMin != null ||
          f.linkKarmaMax != null ||
          f.commentKarmaMin != null ||
          f.commentKarmaMax != null ||
          f.isMod != null ||
          f.isContributor != null ||
          f.verified != null ||
          f.shadowBanned != null
        )
          return true;
      }
    }
  }
  return false;
}

function ruleNeedsAuthorEnrichment(rule: {
  kind: string;
  filter?: unknown;
  rules?: unknown;
}): boolean {
  if (rule.kind === 'author' && rule.filter) {
    const f = rule.filter as Record<string, unknown>;
    return (
      f.ageMinSec != null ||
      f.ageMaxSec != null ||
      f.linkKarmaMin != null ||
      f.linkKarmaMax != null ||
      f.commentKarmaMin != null ||
      f.commentKarmaMax != null ||
      f.isMod != null ||
      f.isContributor != null ||
      f.verified != null ||
      f.shadowBanned != null
    );
  }
  if (rule.kind === 'ruleset' && Array.isArray(rule.rules)) {
    return (rule.rules as { kind: string; filter?: unknown; rules?: unknown }[]).some(
      ruleNeedsAuthorEnrichment
    );
  }
  // Phase 4 — HistoryRule reads karma directly off the enriched Author. The
  // other history-based rules (attribution, recentActivity) only need the
  // username for the cache lookup, so they don't force enrichment.
  if (rule.kind === 'history') {
    const r = rule as Record<string, unknown>;
    return (
      r.linkKarmaLt != null ||
      r.linkKarmaGt != null ||
      r.commentKarmaLt != null ||
      r.commentKarmaGt != null
    );
  }
  return false;
}

export async function normalizePost(
  payload: PostSubmitPayload,
  config: AppConfig
): Promise<NormalizedActivity> {
  const p = payload.post ?? {};
  const a = payload.author ?? {};
  const authorName = a.name ?? '';
  const author = await enrichAuthor(
    authorName,
    a.id ?? p.authorId ?? '',
    config.needsAuthorEnrichment ?? false
  );
  // AE Polish #81: validate the thing-id at the boundary. Invalid =
  // BadTriggerIdError → handleActivity's per-run catch records as
  // (run-error). Pre-Polish this fell through to `id: ''` which
  // produced 400s deep in the action layer.
  const item: Item = {
    ...ITEM_DEFAULTS,
    id: assertThingId(p.id ?? '', 'post'),
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
  const preview = pickPreviewVariant(p);
  if (preview) item.imageUrl = preview;
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
  config: AppConfig
): Promise<NormalizedActivity> {
  const c = payload.comment ?? {};
  const a = payload.author ?? {};
  const authorName = a.name ?? '';
  const author = await enrichAuthor(authorName, a.id ?? '', config.needsAuthorEnrichment ?? false);

  // AE Pull-Forward #6 — fetch parent post title so `{kind:'regex', target:
  // 'title'}` rules can match against the post a comment is on. Without this
  // a title regex on a comment trigger silently never fires (empty string
  // never matches a content pattern) — bot looks broken. Best-effort fetch
  // gated on the rule needing a title; on Reddit-API error fall back to
  // empty string (existing behavior — fail-OPEN, soft signal).
  let parentTitle = '';
  const parentPostId = payload.post?.id;
  if (parentPostId && /^t3_[a-z0-9]+$/i.test(parentPostId)) {
    try {
      const post = await reddit.getPostById(parentPostId as `t3_${string}`);
      parentTitle = post.title ?? '';
    } catch (err) {
      console.warn(
        '[cm/normalize] parent-post title fetch failed (title regex on comment trigger will miss):',
        parentPostId,
        err
      );
    }
  }

  // AE Polish #81: branded-id validation for comments. Same posture
  // as normalizePost — invalid → BadTriggerIdError → handleActivity
  // run-error record.
  const item: Item = {
    ...ITEM_DEFAULTS,
    id: assertThingId(c.id ?? '', 'comment'),
    title: parentTitle,
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
      itemTitle: escapeMarkdown(parentTitle),
      itemBody: escapeMarkdown(item.body),
    },
  };
}
