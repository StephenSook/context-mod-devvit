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
  asPayloadTimestamp,
  type PostSubmitPayload,
  type CommentSubmitPayload,
} from '../shared/normalize';
import * as configStore from '../state/configStore';
import { simulateRule, formatSimulationToast } from '../core/simulateRule';
import { getRecentSample } from '../core/recentSample';
import { explainRule, formatExplainToast } from '../core/explainRule';
import { setOpenaiKey } from '../state/apiKeyStore';
import { requireModerator } from '../lib/requireModerator';
import { checkRateLimit } from '../lib/ratelimit';
import { checkCircuit, recordFailure, recordSuccess } from '../lib/circuitBreaker';
import { log } from '../lib/log';
import { isTransientOpenaiError } from '../lib/openaiErrors';
import { resolveOpenaiKey } from '../lib/resolveOpenaiKey';
import type { AppConfig } from '../shared/types';

export const forms = new Hono();

/**
 * Map requireModerator() failure to user-facing toast text.
 *
 * Why: AE Polish #10 added a 503 (transient mod-check failure) status to
 * distinguish "Reddit RPC blip — retry" from "you're not a mod." Forms
 * previously surfaced the same "Mod-only action" toast for every failure,
 * which lies to actual mods when their auth check fails to a 5xx.
 */
function authFailToast(
  status: 401 | 403 | 500 | 503,
  actionLabel: string,
): string {
  if (status === 503) {
    return `Mod check temporarily unavailable. Retry in ~30s, then ${actionLabel}.`;
  }
  if (status === 500) {
    return `Mod check failed. See logs, then ${actionLabel}.`;
  }
  return `Mod-only action. Only this sub's moderators can ${actionLabel}.`;
}

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

forms.post('/test-rules-submit', async (c) => {
  // Live-playtest 2026-05-16 revealed Devvit form submit envelope is FLAT:
  // `{thingId: '...'}`, NOT `{values: {thingId: '...'}}` per the doc convention
  // we assumed. Defensive multi-shape parse covers older/future envelope shapes
  // without requiring a re-test if Reddit changes the contract.
  const body = await c.req.json<Record<string, unknown>>();
  const auth = await requireModerator();
  if (!auth.ok) {
    return c.json({ showToast: authFailToast(auth.status, 'dry-run ContextMod') });
  }
  const thingId =
    (body as { thingId?: string }).thingId ??
    (body as { values?: { thingId?: string } }).values?.thingId ??
    (body as { payload?: { values?: { thingId?: string } } }).payload?.values?.thingId ??
    (body as { form?: { values?: { thingId?: string } } }).form?.values?.thingId;
  log.info('cm/forms/test-rules-submit', 'opened', { thingId });

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
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error('cm/forms/test-rules-submit', 'failed', { err: e });
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
    return c.json({ showToast: authFailToast(auth.status, 'simulate rules') });
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
    // getRecentSample fetches + caches the last N posts (60 s TTL) so the
    // future live-impact editor endpoint can reuse the same sample without
    // re-hitting Reddit on every keystroke. Per-post normalize errors are
    // logged + skipped inside getRecentSample; reddit-api errors throw so
    // the outer catch below classifies them as the reddit-api phase.
    const samples = await getRecentSample(sub.name);
    const result = await simulateRule(ruleJson5, samples, sub.name);
    return c.json({ showToast: formatSimulationToast(result) });
  } catch (e) {
    // Wave U WARN fix (Codex CR3 #7): prefix toast w/ failure phase so mod
    // knows whether to retry (network/reddit), fix their rule (parse), or
    // contact support (unexpected).
    const msg = e instanceof Error ? e.message : String(e);
    log.error('cm/forms/simulate-rule-submit', 'failed', { err: e });
    const phase =
      msg.includes('getCurrentSubreddit') || msg.includes('getNewPosts')
        ? 'reddit-api'
        : msg.includes('parse') || msg.includes('AJV')
          ? 'rule-parse'
          : 'unexpected';
    return c.json({ showToast: `Simulation failed (${phase}): ${msg}` });
  }
});

/**
 * Wave S Phase S5 — AI rule explainer.
 * Reads openai_api_key from app settings + calls OpenAI chat completions.
 */
forms.post('/explain-rule-submit', async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const auth = await requireModerator();
  if (!auth.ok) {
    return c.json({ showToast: authFailToast(auth.status, 'call OpenAI') });
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
  // AD CRITICAL #1 mirror — apiKey resolve has its own try so a
  // Redis/settings throw becomes a structured toast + log, not a 500.
  let apiKey: string;
  try {
    apiKey = await resolveOpenaiKey(auth.sub);
  } catch (err) {
    log.error('cm/forms/explain-rule-submit', 'api-key resolve failed', { err });
    return c.json({
      showToast: 'Could not read OpenAI API key (Redis/settings unavailable). Retry in ~60s.',
    });
  }
  try {
    const result = await explainRule(ruleJson5, apiKey);
    if (!result.ok) {
      const isTransient = isTransientOpenaiError(result.error);
      if (isTransient) await recordFailure(cbBucket);
    } else {
      await recordSuccess(cbBucket);
    }
    return c.json({ showToast: formatExplainToast(result) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // AD Phase 3 mirror of Tier-1 #3: only open the breaker on transient
    // OpenAI errors. Auth/config exceptions (no key, parse) must not
    // punish the install w/ a cooldown for a user-fixable problem.
    const isTransient = isTransientOpenaiError(msg);
    if (isTransient) await recordFailure(cbBucket);
    log.error('cm/forms/explain-rule-submit', 'failed', { err: e, transient: isTransient });
    return c.json({ showToast: `Explain failed: ${msg}` });
  }
});

// X43 + AD CRITICAL #2 + #9: classifier moved to src/lib/openaiErrors.ts.
// The previous "keep in sync" mirror pattern drifted (one copy gained a
// `// 5xx HTTP` inline comment) AND both copies had the same substring
// bug where `lower.includes('5')` matched any error string containing
// the digit 5. One source of truth now.

forms.post('/set-openai-key-submit', async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const auth = await requireModerator();
  if (!auth.ok) {
    return c.json({ showToast: authFailToast(auth.status, 'set the OpenAI key') });
  }
  const apiKeyRaw =
    (body as { apiKey?: string }).apiKey ??
    (body as { values?: { apiKey?: string } }).values?.apiKey ??
    '';
  // AE Polish #37: normalize whitespace BEFORE validation. Previously
  // `apiKey.startsWith('sk-')` checked the RAW string, so a paste like
  // "  sk-proj-xyz" (leading whitespace common when copying from
  // PDFs / Discord code blocks / wrapped emails) would be REJECTED as
  // "Key should start with sk-..." even though apiKeyStore.setOpenaiKey
  // trims the key before storing — so the underlying key was valid all
  // along. Mods don't get the actionable feedback that whitespace is
  // the issue; just a confusing "wrong format" toast.
  const apiKey = apiKeyRaw.trim();
  if (!apiKey) {
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
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error('cm/forms/set-openai-key-submit', 'failed', { err: e });
    return c.json({ showToast: `Save failed: ${msg}` });
  }
});

