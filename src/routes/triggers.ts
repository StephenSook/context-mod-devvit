/**
 * Trigger handlers — Phase 2 wiring.
 *
 * /post-submit and /comment-submit normalize the V2 payload and dispatch to
 * `handleActivity`, which reads the published config and runs the full
 * rule → check → run → action pipeline.
 *
 * Guard order (D0.1 skeleton kept verbatim — these are NOT moved into
 * handleActivity because they're trigger-shape-specific):
 *   1. Null-safety — bail if post/comment ID is missing.
 *   2. Recursion guard — don't react to our own posts (reddit.getAppUser may
 *      return undefined; null-check is required per RedditClient.d.ts:371).
 *      Skip the guard (rather than bail) when author.name is missing so a
 *      payload anomaly doesn't kill all trigger work.
 *   3. firstSeen idempotency — 24h NX guard so a Devvit retry doesn't
 *      double-fire. Fail-CLOSED on Redis error (returns false → skip).
 *   4. Normalize the V2 payload + dispatch to handleActivity.
 *
 * Kill switch deferred — Ctrl+C on the playtest terminal IS the kill switch
 * for playtest. Revisit before any `devvit publish --public`.
 */

import { Hono } from 'hono';
import { reddit, redis } from '@devvit/web/server';
import { firstSeen } from '../lib/idem';
import {
  normalizePost,
  normalizeComment,
  type PostSubmitPayload,
  type CommentSubmitPayload,
} from '../shared/normalize';
import { handleActivity } from '../core/handleActivity';
import * as configStore from '../state/configStore';
import { parseConfig } from '../core/config';
import { DEFAULT_CONFIG_JSON5 } from '../config/default-config';
import { runMigrations, SCHEMA_VERSION } from '../state/migrations';
import { K } from '../state/keys';
import { recordEvent } from '../state/recentEvents';
import type { AppConfig } from '../shared/types';

export const triggers = new Hono();

/**
 * App-install (Step 3.1). Two responsibilities:
 *   1. Stash the install→subname pointer so cron handlers — which have no
 *      inbound request context — can resolve which sub to fetch the wiki for.
 *   2. Seed the default config on FIRST install only. Re-install (existing
 *      `cfg:current_rev` for this sub) is a no-op so a reinstall doesn't
 *      clobber a mod's wiki-edited config.
 *
 * `OnAppInstallRequest` is NOT exported from `@devvit/web/server` (same
 * pattern as PostSubmitPayload — barrel-export confusion). Local payload
 * interface keeps the type-check honest. The V2 trigger payload does NOT
 * include an installId (plan was wrong — verified in playtest 2026-05-16),
 * so we synthesize one from the subname inside stashInstallPointer().
 */
interface AppInstallPayload {
  subreddit?: { name?: string };
}

/**
 * Stash the installId→subname pointer used by the cron (which has no inbound
 * request context). Reality check from playtest 2026-05-16: the V2 trigger
 * payload does NOT carry installId — the plan's original snippet assumed it.
 * For the hackathon single-install case, synthesize a stable installId of
 * `sub:<subname>` so the existing K.installSubname / K.currentInstallId
 * key shape keeps working without a schema change. Re-running this is a no-op
 * (idempotent SET), so both /app-install and /app-upgrade can call it.
 */
async function stashInstallPointer(subName: string): Promise<void> {
  const installId = `sub:${subName}`;
  await redis.set(K.installSubname(installId), subName);
  await redis.set(K.currentInstallId(), installId);
}

triggers.post('/app-install', async (c) => {
  const input = await c.req.json<AppInstallPayload>();
  const subName = input.subreddit?.name;
  console.log(`[cm/app-install] sub=${subName}`);

  if (subName) {
    await stashInstallPointer(subName);
  }

  if (!subName) {
    console.warn(
      '[cm/app-install] subreddit.name missing — skipping default-config seed'
    );
    return c.json({ status: 'ok' });
  }

  const existing = await redis.get(K.cfgCurrentRev(subName));
  if (existing) {
    console.log(
      `[cm/app-install] sub=${subName} already has cfg:current_rev=${existing} — skip seed`
    );
    return c.json({ status: 'ok' });
  }

  const parsed = parseConfig(DEFAULT_CONFIG_JSON5);
  if (!parsed.ok) {
    console.error(
      '[cm/app-install] default config failed to parse:',
      parsed.errors
    );
    return c.json({ status: 'ok' });
  }
  const rev = await configStore.publish(parsed.config, subName);
  console.log(
    `[cm/app-install] seeded default config rev=${rev} for sub=${subName}`
  );
  return c.json({ status: 'ok' });
});

/**
 * App-upgrade (Step 3.6). Two responsibilities:
 *   1. BACKFILL the install→subname pointer so the cron has somewhere to look
 *      even when the app was installed before Step 3.1 shipped — install fires
 *      once, upgrade fires on every redeploy, so this self-heals existing
 *      installs that never ran the v0.0.1 install handler. Idempotent SET.
 *   2. Compare stored schema version to current — if different, run migrations
 *      and stamp the new version. v0.1 → v0.1 is a no-op today; the seam exists
 *      so a future shape change can land without leaving old installs broken.
 */
triggers.post('/app-upgrade', async (c) => {
  const input = await c.req.json<AppInstallPayload>();
  const subName = input.subreddit?.name;
  if (subName) {
    await stashInstallPointer(subName);
    console.log(
      `[cm/app-upgrade] backfilled install pointer for sub=${subName}`
    );
  }

  const stored = (await redis.get(K.schemaVersion())) ?? '0';
  if (stored === SCHEMA_VERSION) {
    console.log(`[cm/app-upgrade] schema version up-to-date (${stored})`);
    return c.json({ status: 'ok' });
  }
  console.log(`[cm/app-upgrade] migrating ${stored} → ${SCHEMA_VERSION}`);
  await runMigrations(stored, SCHEMA_VERSION);
  await redis.set(K.schemaVersion(), SCHEMA_VERSION);
  return c.json({ status: 'ok' });
});

triggers.post('/post-submit', async (c) => {
  const input = await c.req.json<PostSubmitPayload>();
  const post = input.post;
  if (!post?.id) {
    console.log('[cm/post-submit] null-safety bail (no post.id)');
    return c.json({ status: 'ok' });
  }
  const authorName = input.author?.name;
  if (!authorName) {
    console.warn(
      '[cm/post-submit] author.name missing — recursion guard skipped'
    );
  }

  // Recursion guard. getAppUser() returns User | undefined per
  // node_modules/@devvit/reddit/RedditClient.d.ts:371. If authorName is missing
  // we skip the guard rather than bailing — worst case the bot reacts to its
  // own post on a private test sub.
  if (authorName) {
    const appUser = await reddit.getAppUser();
    if (appUser && authorName === appUser.username)
      return c.json({ status: 'ok' });
  }

  // X39: wrap getCurrentSubreddit — Reddit context loss would otherwise 500
  // the trigger handler and ride Devvit's retry storm. Return 200 + status
  // so Devvit acks and we don't burn retries on a transient context blip.
  let subName: string;
  try {
    subName =
      input.subreddit?.name ?? (await reddit.getCurrentSubreddit()).name;
  } catch (err) {
    console.error('[cm/post-submit] subreddit context unavailable:', err);
    return c.json({ status: 'subreddit-unavailable' });
  }

  // firstSeen BEFORE normalize so a re-delivered trigger doesn't burn the
  // (potentially expensive) getUserByUsername call when the config needs it.
  const seen = await firstSeen(post.id, subName);
  if (!seen) {
    console.warn(
      '[cm/post-submit] firstSeen=false (already-seen OR Redis fail-closed):',
      post.id
    );
    return c.json({ status: 'skipped-already-seen' });
  }

  // Read the config ONCE here and pass it to handleActivity — the read-once
  // invariant. Previous code read here for normalize then handleActivity
  // re-read; a publish between the two reads could split the event across
  // two revs.
  let current: Awaited<ReturnType<typeof configStore.getCurrentRev>>;
  try {
    current = await configStore.getCurrentRev(subName);
  } catch (err) {
    // X3: corrupt config or Redis blip. Don't bubble to Devvit (it retries
    // triggers which could spam). Record an error event so the dashboard
    // turns red + the mod sees their bot has stopped working.
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      '[cm/post-submit] config read failed — moderation stopped:',
      err
    );
    await recordEvent(
      {
        ts: Date.now(),
        activityId: post.id,
        runName: 'config-read-fail',
        checkName: '(infrastructure)',
        triggered: false,
        actions: [
          {
            kind: 'config-read',
            ok: false,
            status: 'error',
            wouldHaveCalled: msg.slice(0, 200),
          },
        ],
      },
      subName
    );
    return c.json({ status: 'config-read-fail' });
  }
  const config: AppConfig = current?.config ?? {
    runs: [],
    needsAuthorEnrichment: false,
  };
  const { item, author } = await normalizePost(input, config);
  await handleActivity(item, author, subName, current ?? undefined);

  return c.json({ status: 'ok' });
});

triggers.post('/comment-submit', async (c) => {
  const input = await c.req.json<CommentSubmitPayload>();
  const comment = input.comment;
  if (!comment?.id) {
    console.log('[cm/comment-submit] null-safety bail (no comment.id)');
    return c.json({ status: 'ok' });
  }
  const authorName = input.author?.name;
  if (!authorName) {
    console.warn(
      '[cm/comment-submit] author.name missing — recursion guard skipped'
    );
  }

  if (authorName) {
    const appUser = await reddit.getAppUser();
    if (appUser && authorName === appUser.username)
      return c.json({ status: 'ok' });
  }

  // X39: wrap getCurrentSubreddit in try/catch — without it, a Reddit
  // context loss during the trigger would 500 the handler and trigger
  // Devvit's retry storm.
  let subName: string;
  try {
    subName =
      input.subreddit?.name ?? (await reddit.getCurrentSubreddit()).name;
  } catch (err) {
    console.error('[cm/comment-submit] subreddit context unavailable:', err);
    return c.json({ status: 'subreddit-unavailable' });
  }

  const seen = await firstSeen(comment.id, subName);
  if (!seen) {
    console.warn(
      '[cm/comment-submit] firstSeen=false (already-seen OR Redis fail-closed):',
      comment.id
    );
    return c.json({ status: 'skipped-already-seen' });
  }

  // Same read-once invariant as /post-submit.
  let current: Awaited<ReturnType<typeof configStore.getCurrentRev>>;
  try {
    current = await configStore.getCurrentRev(subName);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      '[cm/comment-submit] config read failed — moderation stopped:',
      err
    );
    await recordEvent(
      {
        ts: Date.now(),
        activityId: comment.id,
        runName: 'config-read-fail',
        checkName: '(infrastructure)',
        triggered: false,
        actions: [
          {
            kind: 'config-read',
            ok: false,
            status: 'error',
            wouldHaveCalled: msg.slice(0, 200),
          },
        ],
      },
      subName
    );
    return c.json({ status: 'config-read-fail' });
  }
  const config: AppConfig = current?.config ?? {
    runs: [],
    needsAuthorEnrichment: false,
  };
  const { item, author } = await normalizeComment(input, config);
  await handleActivity(item, author, subName, current ?? undefined);

  return c.json({ status: 'ok' });
});
