/**
 * handleActivity orchestrator. Single entry point the trigger handlers call.
 *
 * Pipeline:
 *   1. Read config revision ONCE at event start (atomic publish gate).
 *   2. For each run, evaluate via runRun.
 *   3. On trigger, dispatch each action through runAction (gates on
 *      reserveAction + dry-run) and aggregate ActionResult.
 *   4. Append to events:recent ZSET so the dashboard surfaces what happened.
 *
 * Optional `snapshot` param closes the "trigger reads config N, then
 * handleActivity reads config N+1" race — a publish between the two reads
 * would normalize author enrichment against rev A and execute rules from
 * rev B. Callers w/ a snapshot pass it in; others get a fresh read.
 */

import type { Item, Author } from '../shared/types';
import * as configStore from '../state/configStore';
import type { ConfigSnapshot } from '../state/configStore';
import { runRun } from './runRun';
import { runAction } from './runAction';
import { recordEvent } from '../state/recentEvents';

export async function handleActivity(
  item: Item,
  author: Author,
  subredditName: string,
  snapshot?: ConfigSnapshot
): Promise<void> {
  let current: ConfigSnapshot | null;
  if (snapshot) {
    current = snapshot;
  } else {
    try {
      current = await configStore.getCurrentRev(subredditName);
    } catch (err) {
      // X3: distinguish parse-fail / Redis-fail from no-config. recordEvent
      // surfaces as a red row in the dashboard so the mod sees moderation
      // has stopped instead of assuming the bot is idle.
      console.error('[cm/handleActivity] config read failed — moderation stopped this event:', err);
      const msg = err instanceof Error ? err.message : String(err);
      await recordEvent(
        {
          ts: Date.now(),
          activityId: item.id,
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
        subredditName
      );
      return;
    }
  }
  if (!current) return; // no config yet — fresh install — nothing to do

  for (const run of current.config.runs) {
    // AE Polish #41: per-run try/catch — a rule throw inside ANY of
    // {runRun → runCheck → runRule} (none of which have catches) would
    // bubble all the way up here + abort the for-loop, so runs N+1, N+2
    // etc. for the SAME EVENT would never evaluate. Per-run isolation
    // means one badly-configured run (or one transient external API
    // throw) only loses that run's evaluation, not the rest of the
    // event's runs.
    let result: Awaited<ReturnType<typeof runRun>>;
    try {
      result = await runRun(run, item, author, subredditName);
    } catch (err) {
      console.error(
        '[cm/handleActivity] runRun threw — recording as run-error + continuing to next run:',
        run.name,
        err
      );
      const msg = err instanceof Error ? err.message : String(err);
      await recordEvent(
        {
          ts: Date.now(),
          activityId: item.id,
          runName: run.name,
          checkName: '(run-error)',
          triggered: false,
          actions: [
            {
              kind: 'run-error',
              ok: false,
              status: 'error',
              wouldHaveCalled: msg.slice(0, 200),
            },
          ],
        },
        subredditName
      );
      continue;
    }
    // X47: surface terminated runs (iteration-limit / goto-missing) to the
    // dashboard so mods see misconfigured postBehavior + circular gotos
    // without digging through server logs.
    if (result.terminated) {
      const detail =
        result.terminated === 'goto-missing'
          ? `goto target "${result.missingGotoTarget}" not found in run "${run.name}"`
          : `iteration limit hit in run "${run.name}" (last check: ${result.lastCheckName})`;
      await recordEvent(
        {
          ts: Date.now(),
          activityId: item.id,
          runName: run.name,
          checkName: `(${result.terminated})`,
          triggered: false,
          actions: [
            {
              kind: 'config-error',
              ok: false,
              status: 'error',
              wouldHaveCalled: detail,
            },
          ],
        },
        subredditName
      );
    }
    if (!result.triggered) continue;

    // Codex session-review HIGH 2026-05-16: propagate full ActionResult
    // status + wouldHaveCalled so the dashboard can distinguish dry-run vs
    // error vs skipped-locked vs ok. `ok` remains for back-compat.
    const actionResults: {
      kind: string;
      ok: boolean;
      status: 'ok' | 'skipped-locked' | 'dry-run' | 'error';
      wouldHaveCalled?: string;
    }[] = [];
    for (const action of result.actions) {
      const res = await runAction(action, {
        item,
        author,
        subredditName,
        rev: current.rev,
        config: current.config,
      });
      actionResults.push(
        res.wouldHaveCalled
          ? {
              kind: action.kind,
              ok: res.status === 'ok',
              status: res.status,
              wouldHaveCalled: res.wouldHaveCalled,
            }
          : { kind: action.kind, ok: res.status === 'ok', status: res.status }
      );
    }

    await recordEvent(
      {
        ts: Date.now(),
        activityId: item.id,
        runName: run.name,
        checkName: result.checkName,
        triggered: true,
        actions: actionResults,
      },
      subredditName
    );
  }
}
