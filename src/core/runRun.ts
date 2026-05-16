/**
 * Run state machine. A run is an ordered list of checks. `postBehavior`
 * controls flow:
 *   - 'next' (default) — continue to the next check on trigger
 *   - 'stop'           — halt the run on trigger, returning collected actions
 *   - { goto: name }   — jump to a named check (forward or backward)
 *
 * 100-iteration safety break against infinite `goto` loops. On limit hit,
 * return `{ terminated: 'iteration-limit', lastCheckName }` + `console.error`
 * so mods see "config has a circular goto" instead of a silently-stopped bot.
 */

import type { Run, RunResult, Item, Author, Action } from '../shared/types';
import { runCheck } from './runCheck';

const MAX_ITERATIONS = 100;

export async function runRun(run: Run, item: Item, author: Author): Promise<RunResult> {
  const indexByName = new Map<string, number>();
  run.checks.forEach((c, i) => indexByName.set(c.name, i));

  const collectedActions: Action[] = [];
  let firstTriggeredCheckName = '';
  let i = 0;
  let iterations = 0;
  let lastCheckName = '';

  while (i < run.checks.length) {
    if (++iterations > MAX_ITERATIONS) {
      console.error('[cm/runRun] iteration limit hit — circular goto in run:', run.name, 'lastCheck:', lastCheckName);
      return {
        triggered: collectedActions.length > 0,
        checkName: firstTriggeredCheckName,
        actions: collectedActions,
        terminated: 'iteration-limit',
        lastCheckName,
      };
    }
    const check = run.checks[i]!;
    lastCheckName = check.name;
    const res = await runCheck(check, item, author);
    if (res.triggered) {
      if (!firstTriggeredCheckName) firstTriggeredCheckName = res.checkName;
      collectedActions.push(...res.actions);
      const behavior = check.postBehavior ?? 'next';
      if (behavior === 'stop') break;
      if (typeof behavior === 'object' && 'goto' in behavior) {
        const target = indexByName.get(behavior.goto);
        if (target == null) {
          console.error('[cm/runRun] postBehavior.goto target not found:', behavior.goto, 'in run', run.name);
          break;
        }
        i = target;
        continue;
      }
      // 'next' falls through
    }
    i += 1;
  }

  return {
    triggered: collectedActions.length > 0,
    checkName: firstTriggeredCheckName,
    actions: collectedActions,
  };
}
