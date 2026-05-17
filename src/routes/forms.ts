/**
 * Form submit handlers for ContextMod.
 *
 * /test-rules-submit: Step 3.6 — dry-run rule tester. Mod right-clicks a post
 * or comment, picks "Test rules on this item", form pre-fills thingId, submit
 * runs dryRunActivity (no Reddit side-effects) + renders triggered runs as
 * toast bullets.
 *
 * Codex H1 2026-05-16 fix: previously hand-built Author with all defaults,
 * which silently disagreed with live moderation results for author-aware rules
 * (`authorIs`, isMod, karma, verified, contributor, shadowBanned all
 * defaulted to false/0). Now synthesizes a V2 trigger payload shape from the
 * fetched Post/Comment and routes through normalizePost / normalizeComment so
 * dry-run uses the same enrichment path as live triggers.
 */

import { Hono } from 'hono';
import { reddit } from '@devvit/web/server';
import { dryRunActivity } from '../core/dryRunActivity';
import { normalizePost, normalizeComment, type PostSubmitPayload, type CommentSubmitPayload } from '../shared/normalize';
import * as configStore from '../state/configStore';
import type { AppConfig } from '../shared/types';

export const forms = new Hono();

interface FetchedPost {
  id?: string;
  title?: string;
  body?: string;
  url?: string;
  authorName?: string;
  authorId?: string;
  score?: number;
  isSelf?: boolean;
  nsfw?: boolean;
  locked?: boolean;
  stickied?: boolean;
  createdAt?: number | Date | string;
}

interface FetchedComment {
  id?: string;
  body?: string;
  authorName?: string;
  authorId?: string;
  score?: number;
  parentId?: string;
  createdAt?: number | Date | string;
}

function asPayloadTimestamp(t?: number | Date | string): number | string | undefined {
  if (t == null) return undefined;
  if (typeof t === 'number') return t;
  if (typeof t === 'string') return t;
  return t.getTime();
}

forms.post('/test-rules-submit', async (c) => {
  // Live-playtest 2026-05-16 revealed Devvit form submit envelope is FLAT:
  // `{thingId: '...'}`, NOT `{values: {thingId: '...'}}` per the doc convention
  // we assumed. Defensive multi-shape parse covers older/future envelope shapes
  // without requiring a re-test if Reddit changes the contract.
  const body = await c.req.json<Record<string, unknown>>();
  const thingId =
    (body as { thingId?: string }).thingId ??
    (body as { values?: { thingId?: string } }).values?.thingId ??
    (body as { payload?: { values?: { thingId?: string } } }).payload?.values?.thingId ??
    (body as { form?: { values?: { thingId?: string } } }).form?.values?.thingId;
  console.log(`[cm/forms/test-rules-submit] thingId=${thingId}`);

  if (!thingId) {
    return c.json({ showToast: 'Missing thingId — re-open the form from the menu.' });
  }

  try {
    const sub = await reddit.getCurrentSubreddit();
    const isComment = thingId.startsWith('t1_');

    // Read config FIRST so normalize can decide author enrichment correctly,
    // matching the live trigger path. dryRunActivity reads its own snapshot
    // for rule eval — Codex H3 read-once invariant doesn't apply here since
    // dry-run is single-shot and not concurrent with a publish.
    const current = await configStore.getCurrentRev(sub.name);
    const config: AppConfig = current?.config ?? { runs: [], needsAuthorEnrichment: false };

    let item;
    let author;
    if (isComment) {
      const cmt = (await reddit.getCommentById(thingId as `t1_${string}`)) as unknown as FetchedComment;
      const payload: CommentSubmitPayload = {
        comment: {
          id: cmt.id ?? thingId,
          body: cmt.body ?? '',
          parentId: cmt.parentId ?? '',
          score: cmt.score ?? 0,
          ...(asPayloadTimestamp(cmt.createdAt) !== undefined ? { createdAt: asPayloadTimestamp(cmt.createdAt)! } : {}),
        },
        author: { id: cmt.authorId ?? '', name: cmt.authorName ?? '' },
        subreddit: { name: sub.name },
      };
      ({ item, author } = await normalizeComment(payload, config));
    } else {
      const post = (await reddit.getPostById(thingId as `t3_${string}`)) as unknown as FetchedPost;
      const payload: PostSubmitPayload = {
        post: {
          id: post.id ?? thingId,
          title: post.title ?? '',
          selftext: post.body ?? '',
          url: post.url ?? '',
          authorId: post.authorId ?? '',
          score: post.score ?? 0,
          nsfw: post.nsfw ?? false,
          locked: post.locked ?? false,
          stickied: post.stickied ?? false,
          isSelf: post.isSelf ?? false,
          ...(asPayloadTimestamp(post.createdAt) !== undefined ? { createdAt: asPayloadTimestamp(post.createdAt)! } : {}),
        },
        author: { id: post.authorId ?? '', name: post.authorName ?? '' },
        subreddit: { name: sub.name },
      };
      ({ item, author } = await normalizePost(payload, config));
    }

    const result = await dryRunActivity(item, author, sub.name);

    if (!result.configPresent) {
      return c.json({
        showToast: 'No config published yet — run "Reload config from wiki" first, then retry.',
      });
    }

    const triggered = result.runs.filter((r) => r.triggered);
    if (triggered.length === 0) {
      return c.json({
        showToast: `No rules triggered. Evaluated ${result.runs.length} run(s) at rev ${result.configRev}.`,
      });
    }

    const lines = triggered.map((r) => {
      const actionKinds = r.actions.map((a) => a.kind).join(', ');
      return `• ${r.runName} / ${r.checkName} → ${actionKinds || '(no actions)'}`;
    });
    return c.json({
      showToast: `Dry-run (rev ${result.configRev}):\n${lines.join('\n')}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cm/forms/test-rules-submit] failed:', err);
    return c.json({ showToast: `Dry-run failed: ${msg}` });
  }
});
