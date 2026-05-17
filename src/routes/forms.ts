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
import { simulateRule, formatSimulationToast, type SimulationSample } from '../core/simulateRule';
import { explainRule, formatExplainToast } from '../core/explainRule';
import { settings } from '@devvit/web/server';
import type { AppConfig } from '../shared/types';

export const forms = new Hono();

const SIMULATION_SAMPLE_LIMIT = 25;

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

/**
 * Wave S Phase S1 — simulate rule against history.
 * Mod pastes a rule (JSON5). We fetch the last N posts via reddit API,
 * normalize them, run the proposed rule against each, return a toast w/
 * fired-count + percent + sample IDs.
 */
forms.post('/simulate-rule-submit', async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const ruleJson5 =
    (body as { ruleJson5?: string }).ruleJson5 ??
    (body as { values?: { ruleJson5?: string } }).values?.ruleJson5 ??
    '';
  if (!ruleJson5.trim()) {
    return c.json({ showToast: 'Paste a rule JSON5 in the form field, then submit.' });
  }

  try {
    const sub = await reddit.getCurrentSubreddit();
    // Reuse the live AppConfig snapshot for needsAuthorEnrichment decisions
    // — same enrichment path live rules use, so simulation matches reality.
    const snapshot = await configStore.getCurrentRev(sub.name);
    const config: AppConfig = snapshot?.config ?? {
      runs: [],
      needsAuthorEnrichment: false,
    };

    // reddit.getNewPosts returns a Listing; .all() flattens to an array.
    // Defensive shape: if the surface differs across Devvit minor versions,
    // we fall back to an empty samples array + report it cleanly.
    const recent = await fetchRecentPostsSafe(sub.name);
    const samples: SimulationSample[] = [];
    for (const post of recent) {
      try {
        const payload: PostSubmitPayload = {
          post: {
            id: post.id,
            title: post.title,
            selftext: post.body ?? '',
            url: post.url ?? '',
            authorId: post.authorId ?? '',
            score: post.score ?? 0,
            isSelf: !!post.url?.includes(sub.name),
            nsfw: !!post.nsfw,
            locked: !!post.locked,
            stickied: !!post.stickied,
            createdAt: asPayloadTimestamp(post.createdAt),
          },
          author: { name: post.authorName ?? '', id: post.authorId ?? '' },
        } as PostSubmitPayload;
        const normalized = await normalizePost(payload, config);
        samples.push({ item: normalized.item, author: normalized.author });
      } catch (perPostErr) {
        // skip individual normalization failures, keep going
        console.warn('[cm/forms/simulate-rule-submit] skipped sample:', perPostErr);
      }
    }

    const result = await simulateRule(ruleJson5, samples, sub.name);
    return c.json({ showToast: formatSimulationToast(result) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cm/forms/simulate-rule-submit] failed:', err);
    return c.json({ showToast: `Simulation failed: ${msg}` });
  }
});

interface RedditPostLike {
  id?: string;
  title?: string;
  body?: string;
  url?: string;
  authorId?: string;
  authorName?: string;
  score?: number;
  nsfw?: boolean;
  locked?: boolean;
  stickied?: boolean;
  createdAt?: number | Date | string;
}

/**
 * Wave S Phase S5 — AI rule explainer.
 * Reads openai_api_key from app settings + calls OpenAI chat completions.
 */
forms.post('/explain-rule-submit', async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const ruleJson5 =
    (body as { ruleJson5?: string }).ruleJson5 ??
    (body as { values?: { ruleJson5?: string } }).values?.ruleJson5 ??
    '';
  try {
    const apiKey = ((await settings.get<string>('openai_api_key')) ?? '').trim();
    const result = await explainRule(ruleJson5, apiKey);
    return c.json({ showToast: formatExplainToast(result) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cm/forms/explain-rule-submit] failed:', err);
    return c.json({ showToast: `Explain failed: ${msg}` });
  }
});

interface RedditListingLike<T> {
  all?: () => Promise<T[]> | T[];
}

async function fetchRecentPostsSafe(subredditName: string): Promise<RedditPostLike[]> {
  try {
    const redditAny = reddit as unknown as {
      getNewPosts?: (opts: {
        subredditName: string;
        limit: number;
        pageSize: number;
      }) => Promise<RedditListingLike<RedditPostLike>>;
    };
    if (typeof redditAny.getNewPosts !== 'function') return [];
    const listing = await redditAny.getNewPosts({
      subredditName,
      limit: SIMULATION_SAMPLE_LIMIT,
      pageSize: SIMULATION_SAMPLE_LIMIT,
    });
    if (!listing) return [];
    const all = typeof listing.all === 'function' ? await listing.all() : [];
    return all.slice(0, SIMULATION_SAMPLE_LIMIT);
  } catch (err) {
    console.warn('[cm/forms/simulate-rule-submit] fetchRecentPostsSafe failed:', err);
    return [];
  }
}

