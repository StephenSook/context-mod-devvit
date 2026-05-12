/**
 * Scheduler (cron) handlers for ContextMod.
 *
 * STUBS for Phase 0. All cron handlers MUST acquireLock() at the top
 * to prevent overlapping invocations (per ultraplan M1).
 *
 * Real implementations:
 *   - /refresh-config: Phase 3 Task 28 (every 5min)
 *   - /stats-rollup:   Phase 4 Task 41 (hourly)
 *   - /image-hash-worker: Phase 4 Task 36 (run-on-demand)
 *   - /delayed-eval:   CUT per Codex+ultraplan (was DispatchAction)
 */

import { Hono } from 'hono';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import { acquireLock } from '../lib/idem';

export const scheduler = new Hono();

scheduler.post('/refresh-config', async (c) => {
  const release = await acquireLock('refresh-config');
  if (!release) {
    console.log('[cm/cron/refresh-config] skipped — locked');
    return c.json<TaskResponse>({ status: 'ignored' }, 200);
  }
  try {
    console.log('[cm/cron/refresh-config] tick');
    // TODO Phase 3 Task 28: fetch wiki page, parse JSON5, AJV validate,
    // write to cfg:rev:{n} + bump cfg:current_rev (atomic publish per Codex H4)
  } finally {
    await release();
  }
  return c.json<TaskResponse>({ status: 'success' }, 200);
});

scheduler.post('/stats-rollup', async (c) => {
  const release = await acquireLock('stats-rollup');
  if (!release) return c.json<TaskResponse>({ status: 'ignored' }, 200);
  try {
    console.log('[cm/cron/stats-rollup] tick');
    // TODO Phase 4 Task 41: aggregate stats:daily hash counters
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

scheduler.post('/delayed-eval', async (c) => {
  // CUT per Codex + ultraplan synthesis. Returning success for completeness
  // while we leave the cron-task declaration in devvit.json — will remove
  // the task declaration in the plan-v2 rewrite.
  console.log('[cm/cron/delayed-eval] CUT — endpoint kept as no-op');
  return c.json<TaskResponse>({ status: 'success' }, 200);
});
