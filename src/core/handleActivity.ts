/**
 * Step 2.3 — handleActivity orchestrator.
 *
 * Single entry point the trigger handlers call. Pipeline:
 *   1. Read config revision ONCE at event start (D5 — atomic publish gate).
 *   2. For each run, evaluate via runRun.
 *   3. On trigger, dispatch each action through runAction (which gates on
 *      reserveAction + dry-run) and aggregate {kind, ok} results.
 *   4. Append to events:recent ZSET so the dashboard surfaces what happened.
 *
 * Council fix (Software Lead, 2026-05-14 23:00): the v1 plan wrote `actions: ...`
 * literal in the recordEvent call, but action results were never aggregated —
 * the field would have shipped as `undefined`. Fix: collect ActionResult.status
 * into `{ kind, ok }[]` and pass it explicitly.
 *
 * Council fix (Software Lead, 2026-05-14 23:00): ActionContext.config is REQUIRED
 * so the Phase 2.5 dry-run gate can read `ctx.config.dryRun`. Without `config`,
 * the safety net silently evaluates undefined → false and every action goes live.
 */

import type { Item, Author } from '../shared/types';
import * as configStore from '../state/configStore';
import type { ConfigSnapshot } from '../state/configStore';
import { runRun } from './runRun';
import { runAction } from './runAction';
import { recordEvent } from '../state/recentEvents';

/**
 * Codex H3 2026-05-16: optional `snapshot` param closes the
 * "trigger reads config, then handleActivity reads config AGAIN" race.
 * A publish between the two reads would normalize author enrichment
 * against rev A and execute rules/actions from rev B. Fix: callers that
 * already have a snapshot pass it in; handleActivity uses it. Callers
 * that don't pass (back-compat) fall through to a fresh read.
 */
export async function handleActivity(
  item: Item,
  author: Author,
  subredditName: string,
  snapshot?: ConfigSnapshot,
): Promise<void> {
  const current = snapshot ?? await configStore.getCurrentRev(subredditName);
  if (!current) return;  // no config yet — nothing to do

  for (const run of current.config.runs) {
    const result = await runRun(run, item, author, subredditName);
    if (!result.triggered) continue;

    const actionResults: { kind: string; ok: boolean }[] = [];
    for (const action of result.actions) {
      const res = await runAction(action, {
        item,
        author,
        subredditName,
        rev: current.rev,
        config: current.config,
      });
      actionResults.push({ kind: action.kind, ok: res.status === 'ok' });
    }

    await recordEvent({
      ts: Date.now(),
      activityId: item.id,
      runName: run.name,
      checkName: result.checkName,
      triggered: true,
      actions: actionResults,
    }, subredditName);
  }
}
