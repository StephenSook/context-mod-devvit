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
    console.log('[cm/cron/refresh-config] skipped — locked');
    return c.json<TaskResponse>({ status: 'ignored' }, 200);
  }
  try {
    const installId = await redis.get(K.currentInstallId());
    if (!installId) {
      console.log('[cm/cron/refresh-config] skipped — no installId pointer (pre-install or wiped)');
      return c.json<TaskResponse>({ status: 'ignored' }, 200);
    }
    const subName = await redis.get(K.installSubname(installId));
    if (!subName) {
      console.log(`[cm/cron/refresh-config] skipped — no subname for installId=${installId}`);
      return c.json<TaskResponse>({ status: 'ignored' }, 200);
    }

    const loaded = await loadFromWiki(subName);
    if (!loaded.ok) {
      console.log(`[cm/cron/refresh-config] skipped sub=${subName}: ${loaded.reason}`);
      return c.json<TaskResponse>({ status: 'ignored' }, 200);
    }

    const last = await redis.get(K.cfgLastWikiRev(subName));
    if (last === loaded.revisionId) {
      console.log(
        `[cm/cron/refresh-config] no change for sub=${subName} (rev=${loaded.revisionId})`
      );
      return c.json<TaskResponse>({ status: 'success' }, 200);
    }

    const rev = await configStore.publish(loaded.config, subName);
    await redis.set(K.cfgLastWikiRev(subName), loaded.revisionId);
    console.log(
      `[cm/cron/refresh-config] published rev=${rev} from wiki revision=${loaded.revisionId} sub=${subName}`
    );
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
      console.log('[cm/cron/stats-rollup] skipped — no installId pointer');
      return c.json<TaskResponse>({ status: 'ignored' }, 200);
    }
    const subName = await redis.get(K.installSubname(installId));
    if (!subName) {
      console.log(`[cm/cron/stats-rollup] skipped — no subname for installId=${installId}`);
      return c.json<TaskResponse>({ status: 'ignored' }, 200);
    }
    const { stats, persisted, error } = await writeStatsSnapshot(subName);
    if (!persisted) {
      console.error(
        `[cm/cron/stats-rollup] sub=${subName} compute ok but Redis write failed: ${error}`
      );
      return c.json<TaskResponse>({ status: 'ignored' }, 200);
    }
    console.log(
      `[cm/cron/stats-rollup] sub=${subName} total=${stats.total} today=${stats.today} lastHour=${stats.lastHour}`
    );
  } finally {
    await release();
  }
  return c.json<TaskResponse>({ status: 'success' }, 200);
});

scheduler.post('/image-hash-worker', async (c) => {
  const release = await acquireLock('image-hash-worker');
  if (!release) return c.json<TaskResponse>({ status: 'ignored' }, 200);
  try {
    const req = await c.req.json<TaskRequest<{ postId?: string; imageUrl?: string }>>();
    console.log(`[cm/cron/image-hash-worker] post=${req.data?.postId}`);
    // TODO Phase 4 Task 36: fetch image, decode (pure JS), blockhash, store
    //   - Cap: process up to 8 items per invocation
    //   - Memory: bail if fetch body > 6MB
    //   - Storage: multi-index LSH ZSETs (per Codex H5)
  } finally {
    await release();
  }
  return c.json<TaskResponse>({ status: 'success' }, 200);
});
