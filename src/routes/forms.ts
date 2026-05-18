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
import {
  normalizePost,
  normalizeComment,
  type PostSubmitPayload,
  type CommentSubmitPayload,
} from '../shared/normalize';
import * as configStore from '../state/configStore';
import { simulateRule, formatSimulationToast, type SimulationSample } from '../core/simulateRule';
import { explainRule, formatExplainToast } from '../core/explainRule';
import { settings } from '@devvit/web/server';
import { setOpenaiKey, getOpenaiKey } from '../state/apiKeyStore';
import { requireModerator } from '../lib/requireModerator';
import { checkRateLimit } from '../lib/ratelimit';
import { checkCircuit, recordFailure, recordSuccess } from '../lib/circuitBreaker';
import { type Result, ok, err } from '../lib/result';

/**
 * Wave V hotfix — resolve OpenAI API key with fallback chain:
 *   1. Redis (preferred — set via "ContextMod: Set OpenAI API key" mod menu)
 *   2. Devvit subreddit setting (fallback for mods who prefer settings UI)
 *
 * Devvit CLI for global-scope settings is broken (Unimplemented RPC).
 * Subreddit-scope settings don't allow isSecret. Redis is the cleanest path.
 */
async function resolveOpenaiKey(sub: string): Promise<string> {
  const fromRedis = await getOpenaiKey(sub);
  if (fromRedis) return fromRedis;
  const fromSettings = ((await settings.get<string>('openai_api_key')) ?? '').trim();
  return fromSettings;
}
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
  const auth = await requireModerator();
  if (!auth.ok) {
    return c.json({
      showToast: "Mod-only action. Only this sub's moderators can dry-run ContextMod.",
    });
  }
  const thingId =
    (body as { thingId?: string }).thingId ??
    (body as { values?: { thingId?: string } }).values?.thingId ??
    (body as { payload?: { values?: { thingId?: string } } }).payload?.values?.thingId ??
    (body as { form?: { values?: { thingId?: string } } }).form?.values?.thingId;
  console.log(`[cm/forms/test-rules-submit] thingId=${thingId}`);

  if (!thingId) {
    return c.json({
      showToast: 'Missing thingId — re-open the form from the menu.',
    });
  }

  try {
    const sub = await reddit.getCurrentSubreddit();
    const isComment = thingId.startsWith('t1_');

    // Read config FIRST so normalize can decide author enrichment correctly,
    // matching the live trigger path. dryRunActivity reads its own snapshot
    // for rule eval — Codex H3 read-once invariant doesn't apply here since
    // dry-run is single-shot and not concurrent with a publish.
    const current = await configStore.getCurrentRev(sub.name);
    const config: AppConfig = current?.config ?? {
      runs: [],
      needsAuthorEnrichment: false,
    };

    let item;
    let author;
    if (isComment) {
      const cmt = (await reddit.getCommentById(
        thingId as `t1_${string}`
      )) as unknown as FetchedComment;
      const payload: CommentSubmitPayload = {
        comment: {
          id: cmt.id ?? thingId,
          body: cmt.body ?? '',
          parentId: cmt.parentId ?? '',
          score: cmt.score ?? 0,
          ...(asPayloadTimestamp(cmt.createdAt) !== undefined
            ? { createdAt: asPayloadTimestamp(cmt.createdAt)! }
            : {}),
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
          ...(asPayloadTimestamp(post.createdAt) !== undefined
            ? { createdAt: asPayloadTimestamp(post.createdAt)! }
            : {}),
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
  const auth = await requireModerator();
  if (!auth.ok) {
    return c.json({
      showToast: "Mod-only action. Only this sub's moderators can simulate rules.",
    });
  }
  const ruleJson5 =
    (body as { ruleJson5?: string }).ruleJson5 ??
    (body as { values?: { ruleJson5?: string } }).values?.ruleJson5 ??
    '';
  if (!ruleJson5.trim()) {
    return c.json({
      showToast: 'Paste a rule JSON5 in the form field, then submit.',
    });
  }
  // X44: 10KB cap on pasted rule + per-sub rate limit (simulation fans
  // out 25 Reddit API reads). Without this, a mod could DOS the Reddit
  // API quota for their sub via rapid retry.
  if (ruleJson5.length > 10_000) {
    return c.json({
      showToast: 'Rule JSON5 too large (cap 10KB). Trim + retry.',
    });
  }
  const rlSim = await checkRateLimit('simulate', auth.sub, 10, 3600);
  // Fail-CLOSED on degraded — simulation fans out 25 Reddit API reads;
  // unlimited retries during a Redis-rate-limit outage could DOS the sub's
  // Reddit API quota. Cost gate > availability gate.
  if (rlSim.degraded) {
    return c.json({
      showToast: 'Rate-limit subsystem degraded (Redis down). Retry in ~60s.',
    });
  }
  if (!rlSim.allowed) {
    return c.json({
      showToast: `Rate limit: ${rlSim.count}/${rlSim.max} simulations this hour. Try again in ~${Math.ceil(rlSim.resetInSec / 60)}min.`,
    });
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
    // AD Tier-1 #1: fetchRecentPostsSafe now returns Result — propagate
    // reddit-api failure to toast w/ failure phase instead of "fired 0/0".
    const recentResult = await fetchRecentPostsSafe(sub.name);
    if (!recentResult.ok) {
      return c.json({
        showToast: `Simulation failed (reddit-api): ${recentResult.error}`,
      });
    }
    const recent = recentResult.value;
    const samples: SimulationSample[] = [];
    let skipped = 0;
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
        // AD Tier-1 #2: count skipped samples so the toast can disclose
        // partial-coverage instead of silently shrinking the corpus.
        skipped += 1;
        console.warn(
          '[cm/forms/simulate-rule-submit] skipped sample:',
          perPostErr
        );
      }
    }

    const result = await simulateRule(ruleJson5, samples, sub.name);
    const baseToast = formatSimulationToast(result);
    const suffix =
      skipped > 0 ? ` (${skipped}/${recent.length} samples skipped — normalize error)` : '';
    return c.json({ showToast: `${baseToast}${suffix}` });
  } catch (err) {
    // Wave U WARN fix (Codex CR3 #7): prefix toast w/ failure phase so mod
    // knows whether to retry (network/reddit), fix their rule (parse), or
    // contact support (unexpected).
    const msg = err instanceof Error ? err.message : String(err);
    const name = err instanceof Error ? err.name : 'Error';
    console.error('[cm/forms/simulate-rule-submit] failed:', name, msg);
    const phase =
      msg.includes('getCurrentSubreddit') || msg.includes('getNewPosts')
        ? 'reddit-api'
        : msg.includes('parse') || msg.includes('AJV')
          ? 'rule-parse'
          : 'unexpected';
    return c.json({ showToast: `Simulation failed (${phase}): ${msg}` });
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
  const auth = await requireModerator();
  if (!auth.ok) {
    return c.json({
      showToast: "Mod-only action. Only this sub's moderators can call OpenAI.",
    });
  }
  const ruleJson5 =
    (body as { ruleJson5?: string }).ruleJson5 ??
    (body as { values?: { ruleJson5?: string } }).values?.ruleJson5 ??
    '';
  // X44: parity w/ /api/explain-event — circuit breaker FIRST, then rate
  // limit. Without these gates, /explain-rule-submit was the cheap path to
  // burn the OpenAI quota via repeated paste-submit clicks.
  const cbBucket = `openai:${auth.sub}`;
  const cb = await checkCircuit(cbBucket);
  if (cb.state === 'open') {
    return c.json({
      showToast: `OpenAI temporarily unavailable (breaker open). Retry in ~${cb.retryInSec}s.`,
    });
  }
  const rl = await checkRateLimit('explain-rule', auth.sub, 30, 3600);
  // Fail-CLOSED on degraded — cost-bearing OpenAI endpoint.
  if (rl.degraded) {
    return c.json({
      showToast: 'Rate-limit subsystem degraded (Redis down). Retry in ~60s.',
    });
  }
  if (!rl.allowed) {
    return c.json({
      showToast: `Rate limit: ${rl.count}/${rl.max} calls this hour. Try again in ~${Math.ceil(rl.resetInSec / 60)}min.`,
    });
  }
  const apiKey = await resolveOpenaiKey(auth.sub);
  try {
    const result = await explainRule(ruleJson5, apiKey);
    if (!result.ok) {
      const isTransient = isTransientOpenaiError(result.error);
      if (isTransient) await recordFailure(cbBucket);
    } else {
      await recordSuccess(cbBucket);
    }
    return c.json({ showToast: formatExplainToast(result) });
  } catch (err) {
    await recordFailure(cbBucket);
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cm/forms/explain-rule-submit] failed:', err);
    return c.json({ showToast: `Explain failed: ${msg}` });
  }
});

// X43 isTransientOpenaiError mirror — keep src/routes/forms.ts + src/routes/
// api.ts in sync. Same classifier prevents the breaker from opening on
// user-config errors (401, missing key, insufficient quota).
function isTransientOpenaiError(error: string): boolean {
  const lower = error.toLowerCase();
  if (lower.includes('missing') || lower.includes('api key')) return false;
  if (lower.includes('401') || lower.includes('invalid_api_key')) return false;
  if (lower.includes('insufficient_quota')) return false;
  return (
    lower.includes('5') ||
    lower.includes('timeout') ||
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('aborted') ||
    lower.includes('econnreset') ||
    lower.includes('429') ||
    lower.includes('rate-limited')
  );
}

forms.post('/set-openai-key-submit', async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const auth = await requireModerator();
  if (!auth.ok) {
    return c.json({
      showToast: "Mod-only action. Only this sub's moderators can set the OpenAI key.",
    });
  }
  const apiKey =
    (body as { apiKey?: string }).apiKey ??
    (body as { values?: { apiKey?: string } }).values?.apiKey ??
    '';
  if (!apiKey.trim()) {
    return c.json({ showToast: 'Paste a key in the form field.' });
  }
  if (!apiKey.startsWith('sk-')) {
    return c.json({
      showToast: 'Key should start with sk-... — double-check + try again.',
    });
  }
  // X44: cap key length at 200 chars. OpenAI keys are ~50 chars; this
  // guards against accidental 5MB clipboard pastes from filling Redis.
  if (apiKey.length > 200) {
    return c.json({
      showToast: 'Key suspiciously long (>200 chars). Re-copy + try again.',
    });
  }
  try {
    await setOpenaiKey(auth.sub, apiKey);
    const masked = apiKey.slice(0, 7) + '...' + apiKey.slice(-4);
    return c.json({
      showToast: `OpenAI key saved for r/${auth.sub} (${masked}).`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cm/forms/set-openai-key-submit] failed:', err);
    return c.json({ showToast: `Save failed: ${msg}` });
  }
});

interface RedditListingLike<T> {
  all?: () => Promise<T[]> | T[];
}

/**
 * AD Tier-1 bug #1 fix — previously returned `[]` on any failure path, which
 * caused the simulator to report "fired 0/0" indistinguishably from a real
 * "no rule triggers fired" result. Now returns a discriminated Result so the
 * caller can surface the actual failure phase in the toast (judges + mods
 * deserve "Reddit API unavailable — try again" not a silent zero).
 */
async function fetchRecentPostsSafe(
  subredditName: string
): Promise<Result<RedditPostLike[], string>> {
  try {
    const redditAny = reddit as unknown as {
      getNewPosts?: (opts: {
        subredditName: string;
        limit: number;
        pageSize: number;
      }) => Promise<RedditListingLike<RedditPostLike>>;
    };
    if (typeof redditAny.getNewPosts !== 'function') {
      return err('reddit.getNewPosts unavailable in this Devvit runtime');
    }
    const listing = await redditAny.getNewPosts({
      subredditName,
      limit: SIMULATION_SAMPLE_LIMIT,
      pageSize: SIMULATION_SAMPLE_LIMIT,
    });
    if (!listing) return err('reddit.getNewPosts returned empty listing');
    const all = typeof listing.all === 'function' ? await listing.all() : [];
    return ok(all.slice(0, SIMULATION_SAMPLE_LIMIT));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(
      '[cm/forms/simulate-rule-submit] fetchRecentPostsSafe failed:',
      msg
    );
    return err(`reddit-api: ${msg}`);
  }
}
