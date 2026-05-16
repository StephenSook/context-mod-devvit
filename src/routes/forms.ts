/**
 * Form submit handlers for ContextMod.
 *
 * /test-rules-submit: Step 3.6 — dry-run rule tester. Mod right-clicks a post
 * or comment, picks "Test rules on this item", form pre-fills thingId, submit
 * runs dryRunActivity (no Reddit side-effects) + renders triggered runs as
 * toast bullets.
 */

import { Hono } from 'hono';
import { reddit } from '@devvit/web/server';
import { dryRunActivity } from '../core/dryRunActivity';
import type { Item, Author } from '../shared/types';

export const forms = new Hono();

interface PostLike {
  id?: string;
  title?: string;
  body?: string;
  url?: string;
  authorName?: string;
  score?: number;
  isSelf?: boolean;
  nsfw?: boolean;
  locked?: boolean;
  stickied?: boolean;
  createdAt?: number | Date;
}

interface CommentLike {
  id?: string;
  body?: string;
  authorName?: string;
  score?: number;
  createdAt?: number | Date;
}

function ageSeconds(createdAt?: number | Date): number {
  if (!createdAt) return 0;
  const ms = createdAt instanceof Date ? createdAt.getTime() : createdAt;
  return Math.max(0, Math.floor((Date.now() - ms) / 1000));
}

const ITEM_DEFAULTS = {
  removed: false, approved: false, locked: false, stickied: false,
  isSelf: false, over18: false, linkFlairText: null as string | null,
};
const AUTHOR_DEFAULTS = {
  id: '', age: 0, linkKarma: 0, commentKarma: 0,
  flairText: null as string | null,
  isMod: false, isContributor: false, verified: false, shadowBanned: false,
};

forms.post('/test-rules-submit', async (c) => {
  const body = await c.req.json<{ values?: { thingId?: string } }>();
  const thingId = body.values?.thingId;
  console.log(`[cm/forms/test-rules-submit] thingId=${thingId}`);

  if (!thingId) {
    return c.json({ showToast: 'Missing thingId — re-open the form from the menu.' });
  }

  try {
    const sub = await reddit.getCurrentSubreddit();
    const isComment = thingId.startsWith('t1_');

    let item: Item;
    let authorName: string;
    if (isComment) {
      const cmt = (await reddit.getCommentById(thingId as `t1_${string}`)) as unknown as CommentLike;
      authorName = cmt.authorName ?? '';
      item = {
        ...ITEM_DEFAULTS,
        id: cmt.id ?? thingId,
        title: '',
        body: cmt.body ?? '',
        url: '',
        author: authorName,
        age: ageSeconds(cmt.createdAt),
        score: cmt.score ?? 0,
      };
    } else {
      const post = (await reddit.getPostById(thingId as `t3_${string}`)) as unknown as PostLike;
      authorName = post.authorName ?? '';
      item = {
        ...ITEM_DEFAULTS,
        id: post.id ?? thingId,
        title: post.title ?? '',
        body: post.body ?? '',
        url: post.url ?? '',
        author: authorName,
        age: ageSeconds(post.createdAt),
        score: post.score ?? 0,
        isSelf: post.isSelf ?? false,
        over18: post.nsfw ?? false,
        locked: post.locked ?? false,
        stickied: post.stickied ?? false,
      };
    }

    const author: Author = { ...AUTHOR_DEFAULTS, name: authorName };

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
