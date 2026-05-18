/**
 * Check evaluator. A check is a list of rules combined with AND or OR plus an
 * optional pre-filter. Filters are short-circuit gates: if they fail, the
 * check is skipped (not triggered) and no rules run.
 *
 * AE CRITICAL #4: hard-mute gate. A mod muting a rule via the dashboard's
 * MuteButton writes to cm:muted-rules:{sub} (see src/state/muteSet.ts), and
 * runCheck now reads that store on every evaluation. If the (runName,
 * checkName) pair is muted, the check short-circuits as not-triggered before
 * any rule eval or action fires. Soft-mute (dashboard-side filter) was the
 * v0.3.0 MVP; this wires the backend so the mute button actually stops the
 * bot. isRuleMuted fail-OPENs on a Redis blip (per X48) so a network blip
 * can't accidentally re-enable a muted rule mid-storm; the muteSet log line
 * surfaces the degraded read for ops.
 */

import type { Check, CheckResult, Item, Author } from '../shared/types';
import { passesFilters } from './filters';
import { runRule } from './runRule';
import { isRuleMuted } from '../state/muteSet';

export async function runCheck(
  check: Check,
  item: Item,
  author: Author,
  sub?: string,
  runName?: string
): Promise<CheckResult> {
  // AE CRITICAL #4: hard-mute short-circuit. Skip if (sub, runName) absent
  // (e.g. dry-run sibling path may not thread them) so we don't break the
  // existing call site contract.
  if (sub && runName && (await isRuleMuted(sub, runName, check.name))) {
    return { triggered: false, checkName: check.name, actions: [] };
  }
  if (!passesFilters(check.filters, item, author)) {
    return { triggered: false, checkName: check.name, actions: [] };
  }
  if (check.rules.length === 0) {
    return { triggered: false, checkName: check.name, actions: [] };
  }
  if (check.combinator === 'AND') {
    for (const r of check.rules) {
      const res = await runRule(r, item, author, sub);
      if (!res.triggered) {
        return { triggered: false, checkName: check.name, actions: [] };
      }
    }
    return {
      triggered: true,
      checkName: check.name,
      actions: check.actions ?? [],
    };
  }
  // OR
  for (const r of check.rules) {
    const res = await runRule(r, item, author, sub);
    if (res.triggered) {
      return {
        triggered: true,
        checkName: check.name,
        actions: check.actions ?? [],
      };
    }
  }
  return { triggered: false, checkName: check.name, actions: [] };
}
