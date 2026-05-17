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
 * Codex H1 (2026-05-16) fixed: global config.dryRun=true now blocks per-action
 * dryRun=false. Since this function ALWAYS sets action.dryRun=true, that gate
 * always forces dry-run mode on, regardless of config.dryRun setting. No safety bypass.
 */

import type { Item, Author, Action } from '../shared/types';
import * as configStore from '../state/configStore';
import { runRun } from './runRun';
import { runAction } from './runAction';

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
  subredditName: string,
): Promise<DryRunResult> {
  const current = await configStore.getCurrentRev(subredditName);
  if (!current) {
    return { configPresent: false, runs: [] };
  }

  const runs: DryRunRunResult[] = [];
  for (const run of current.config.runs) {
    const result = await runRun(run, item, author, subredditName);
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
      });
      // Spread guard avoids exactOptionalPropertyTypes incompatibility — only
      // include wouldHaveCalled when it's a defined string.
      actions.push(
        res.status === 'dry-run' && res.wouldHaveCalled
          ? { kind: action.kind, wouldHaveCalled: res.wouldHaveCalled }
          : { kind: action.kind },
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
