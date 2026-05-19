/**
 * Cron handlers for ContextMod. Every handler MUST acquireLock() at the top
 * to prevent overlapping invocations.
 *
 * Shipped: /refresh-config (5-min wiki pull + republish), /stats-rollup
 * (hourly snapshot of events:recent50 aggregations for fast /api/stats).
 * Stubs (not wired yet): /image-hash-worker (on-demand blockhash for
 * repost-image mode, gated on Phase 4.7 spike).
 */

import { Hono } from 'hono';
import { redis, type TaskRequest, type TaskResponse } from '@devvit/web/server';
import { acquireLock } from '../lib/idem';
import { K } from '../state/keys';
import * as configStore from '../state/configStore';
import { loadFromWiki } from '../core/configSource';
import { writeStatsSnapshot } from '../state/statsRollup';
import { log } from '../lib/log';
import { fetchAndDecode } from '../image/decode';
import { computeBlockhash } from '../image/hash';
import { recordHash } from '../state/imageHashStore';

export const scheduler = new Hono();

/**
 * Refresh-config cron (Step 3.3). Every 5 min:
 *   1. Single-flight via cm:lock:refresh-config (60s NX).
 *   2. Resolve sub from installId pointer — `reddit.getCurrentSubredditName()`
 *      doesn't work in scheduler context (no inbound Reddit request).
 *      Stash from /app-install + read here.
 *   3. Load wiki page. Compare its revisionId to cfg:last-wiki-rev. If
 *      unchanged, skip — saves a config publish + ZSET allocation per tick.
 *   4. Publish + stamp the new wiki rev.
 */
scheduler.post('/refresh-config', async (c) => {
  const release = await acquireLock('refresh-config');
  if (!release) {
    log.info('cm/cron/refresh-config', 'skipped — locked');
    return c.json<TaskResponse>({ status: 'ignored' }, 200);
  }
  try {
    const installId = await redis.get(K.currentInstallId());
    if (!installId) {
      log.info('cm/cron/refresh-config', 'skipped — no installId pointer (pre-install or wiped)');
      return c.json<TaskResponse>({ status: 'ignored' }, 200);
    }
    const subName = await redis.get(K.installSubname(installId));
    if (!subName) {
      log.info('cm/cron/refresh-config', 'skipped — no subname for installId', { installId });
      return c.json<TaskResponse>({ status: 'ignored' }, 200);
    }

    const loaded = await loadFromWiki(subName);
    if (!loaded.ok) {
      log.info('cm/cron/refresh-config', 'skipped', { sub: subName, reason: loaded.reason });
      return c.json<TaskResponse>({ status: 'ignored' }, 200);
    }

    const last = await redis.get(K.cfgLastWikiRev(subName));
    if (last === loaded.revisionId) {
      log.info('cm/cron/refresh-config', 'no change', {
        sub: subName,
        rev: loaded.revisionId,
      });
      return c.json<TaskResponse>({ status: 'success' }, 200);
    }

    // AE Polish #63: silent-failure-hunter CRITICAL — previously the
    // configStore.publish() + redis.set(cfgLastWikiRev) calls ran with NO
    // try/catch. A PublishError ("rev allocated but payload write or
    // pointer advance failed") propagated out of this handler, the finally
    // released the lock, Hono returned an unhandled 500 — but mods saw NO
    // dashboard signal that the wiki → live-config sync had silently
    // stopped working. Worse, the next cron tick 5 min later would either
    // (a) re-attempt and possibly succeed (transient blip recovered) or
    // (b) fail again — either way leaving the cluster in a state where
    // wiki edits never reach the rule engine until manual intervention.
    //
    // Sibling cron /stats-rollup (line 101-108) handles its persistence
    // failure via writeStatsSnapshot returning a discriminated
    // {persisted, error} result + an explicit log.error. Mirror that
    // pattern here: wrap publish+set in try/catch, log.error w/ the
    // PublishError details, return {status:'ignored'} so the scheduler
    // backs off and the next 5-min tick retries cleanly.
    try {
      const rev = await configStore.publish(loaded.config, subName);
      await redis.set(K.cfgLastWikiRev(subName), loaded.revisionId);
      log.info('cm/cron/refresh-config', 'published', {
        sub: subName,
        rev,
        wikiRev: loaded.revisionId,
      });
    } catch (err) {
      log.error('cm/cron/refresh-config', 'publish failed — wiki config NOT applied', {
        sub: subName,
        wikiRev: loaded.revisionId,
        err: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      });
      return c.json<TaskResponse>({ status: 'ignored' }, 200);
    }
  } finally {
    await release();
  }
  return c.json<TaskResponse>({ status: 'success' }, 200);
});

/**
 * Stats-rollup cron (Y1-X7). Hourly aggregation of the per-install
 * events:recent50 ZSET into a per-sub snapshot at cm:stats:snapshot:{sub}.
 * /api/stats reads the snapshot key for a cheap dashboard render instead
 * of recomputing on every poll.
 */
scheduler.post('/stats-rollup', async (c) => {
  const release = await acquireLock('stats-rollup');
  if (!release) return c.json<TaskResponse>({ status: 'ignored' }, 200);
  try {
    const installId = await redis.get(K.currentInstallId());
    if (!installId) {
      log.info('cm/cron/stats-rollup', 'skipped — no installId pointer');
      return c.json<TaskResponse>({ status: 'ignored' }, 200);
    }
    const subName = await redis.get(K.installSubname(installId));
    if (!subName) {
      log.info('cm/cron/stats-rollup', 'skipped — no subname for installId', { installId });
      return c.json<TaskResponse>({ status: 'ignored' }, 200);
    }
    const { stats, persisted, error } = await writeStatsSnapshot(subName);
    if (!persisted) {
      log.error('cm/cron/stats-rollup', 'compute ok but Redis write failed', {
        sub: subName,
        err: error,
      });
      return c.json<TaskResponse>({ status: 'ignored' }, 200);
    }
    log.info('cm/cron/stats-rollup', 'snapshot written', {
      sub: subName,
      total: stats.total,
      today: stats.today,
      lastHour: stats.lastHour,
    });
  } finally {
    await release();
  }
  return c.json<TaskResponse>({ status: 'success' }, 200);
});

/**
 * Phase 4.7 image-hash worker (one-shot backfill path). Standard trigger
 * flow already hashes-on-arrival via runImageRepostRule (which calls
 * fetchAndDecode + computeBlockhash + recordHash inline). This worker is
 * for the rare backfill case where a mod adds the imageRepost rule to a
 * config AFTER posts have already been processed — it lets them seed the
 * store w/ a known postId+imageUrl pair so subsequent reposts can match.
 *
 * Single-flight via acquireLock. Body: {postId, imageUrl}. Returns success
 * for both decode-failure (fail-OPEN per the rule's posture) and success
 * paths — the worker is best-effort backfill, not a safety gate.
 */
scheduler.post('/image-hash-worker', async (c) => {
  const release = await acquireLock('image-hash-worker');
  if (!release) return c.json<TaskResponse>({ status: 'ignored' }, 200);
  try {
    const req = await c.req.json<TaskRequest<{ postId?: string; imageUrl?: string; sub?: string }>>();
    const { postId, imageUrl, sub } = req.data ?? {};
    if (!postId || !imageUrl) {
      log.warn('cm/cron/image-hash-worker', 'skipped — missing postId or imageUrl', {
        postId,
        hasImageUrl: !!imageUrl,
      });
      return c.json<TaskResponse>({ status: 'ignored' }, 200);
    }
    log.info('cm/cron/image-hash-worker', 'received', { postId, sub });
    const decoded = await fetchAndDecode(imageUrl);
    if (!decoded.ok) {
      log.warn('cm/cron/image-hash-worker', 'decode failed (fail-open)', {
        postId,
        phase: decoded.phase,
        err: decoded.error,
      });
      return c.json<TaskResponse>({ status: 'success' }, 200);
    }
    try {
      const hash = computeBlockhash(decoded.frame);
      await recordHash({ postId, hash, ts: Date.now() }, undefined, sub);
      log.info('cm/cron/image-hash-worker', 'backfilled', { postId, sub });
    } catch (err) {
      log.warn('cm/cron/image-hash-worker', 'blockhash failed (fail-open)', { postId, err });
    }
  } finally {
    await release();
  }
  return c.json<TaskResponse>({ status: 'success' }, 200);
});
