/**
 * Step 3.6 — Dry-run rule tester pipeline.
 *
 * Mirrors handleActivity's read-and-evaluate flow but:
 *   - Forces dryRun: true on every action (overrides config + per-action setting)
 *   - Returns structured DryRunResult instead of writing to recentEvents ZSET
 *   - Surfaces non-triggered runs so the form UI can show "no rules matched"
 *
 * Non-contract design choice (2026-05-16): keeps Vinh's handleActivity void
 * signature stable. Slight pipeline duplication (~30 lines) is the cost.
 *
 * Invariant: global config.dryRun=true now blocks per-action
 * dryRun=false. Since this function ALWAYS sets action.dryRun=true, that gate
 * always forces dry-run mode on, regardless of config.dryRun setting. No safety bypass.
 */

import type { Item, Author, Action } from '../shared/types';
import * as configStore from '../state/configStore';
import { runRun } from './runRun';
import { runAction } from './runAction';
import { runWithTimeout, RunTimeoutError } from '../lib/timeout';

export interface DryRunActionResult {
  kind: string;
  wouldHaveCalled?: string;
}

export interface DryRunRunResult {
  runName: string;
  triggered: boolean;
  checkName?: string;
  actions: DryRunActionResult[];
}

export interface DryRunResult {
  configPresent: boolean;
  configRev?: number;
  runs: DryRunRunResult[];
}

export async function dryRunActivity(
  item: Item,
  author: Author,
  subredditName: string
): Promise<DryRunResult> {
  const current = await configStore.getCurrentRev(subredditName);
  if (!current) {
    return { configPresent: false, runs: [] };
  }

  const runs: DryRunRunResult[] = [];
  for (const run of current.config.runs) {
    // AE Polish #48: parity with handleActivity per-run try/catch + timeout.
    // Pre-fix: a hung runRun (e.g. imageRepost rule fetch that never returns)
    // inside a mod's "Test rules on this item" form submit would stall the
    // form indefinitely until Devvit's request timeout fired — UX impact
    // is the form just fails silently. Same hang vector handleActivity
    // closed via Polish #42; same shared withTimeout primitive used here.
    let result: Awaited<ReturnType<typeof runRun>>;
    try {
      result = await runWithTimeout(runRun(run, item, author, subredditName), run.name);
    } catch (err) {
      const isTimeout = err instanceof RunTimeoutError;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[cm/dryRunActivity] runRun ${isTimeout ? 'timed out' : 'threw'} — recording run as failed + continuing:`,
        run.name,
        err
      );
      runs.push({
        runName: run.name,
        triggered: false,
        checkName: isTimeout ? '(run-timeout)' : '(run-error)',
        actions: [{ kind: isTimeout ? 'run-timeout' : 'run-error', wouldHaveCalled: msg.slice(0, 200) }],
      });
      continue;
    }
    if (!result.triggered) {
      runs.push({ runName: run.name, triggered: false, actions: [] });
      continue;
    }

    const actions: DryRunActionResult[] = [];
    for (const action of result.actions) {
      const forcedDryRun: Action = { ...action, dryRun: true };
      const res = await runAction(forcedDryRun, {
        item,
        author,
        subredditName,
        rev: current.rev,
        config: current.config,
        // AE CRITICAL #7: mod-menu dry-run is repeatable + has no retry
        // concern — skip the idempotency primitives so a mod hitting
        // "Test rules on this item" multiple times sees the full eval
        // trace each time instead of skipped-locked after the first.
        bypassIdempotency: true,
      });
      // Spread guard avoids exactOptionalPropertyTypes incompatibility — only
      // include wouldHaveCalled when it's a defined string.
      actions.push(
        res.status === 'dry-run' && res.wouldHaveCalled
          ? { kind: action.kind, wouldHaveCalled: res.wouldHaveCalled }
          : { kind: action.kind }
      );
    }

    runs.push({
      runName: run.name,
      triggered: true,
      checkName: result.checkName,
      actions,
    });
  }

  return { configPresent: true, configRev: current.rev, runs };
}
