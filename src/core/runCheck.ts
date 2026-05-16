/**
 * Check evaluator. A check is a list of rules combined with AND or OR plus an
 * optional pre-filter. Filters are short-circuit gates: if they fail, the
 * check is skipped (not triggered) and no rules run.
 */

import type { Check, CheckResult, Item, Author } from '../shared/types';
import { passesFilters } from './filters';
import { runRule } from './runRule';

export async function runCheck(check: Check, item: Item, author: Author): Promise<CheckResult> {
  if (!passesFilters(check.filters, item, author)) {
    return { triggered: false, checkName: check.name, actions: [] };
  }
  if (check.rules.length === 0) {
    return { triggered: false, checkName: check.name, actions: [] };
  }
  if (check.combinator === 'AND') {
    for (const r of check.rules) {
      const res = await runRule(r, item, author);
      if (!res.triggered) {
        return { triggered: false, checkName: check.name, actions: [] };
      }
    }
    return { triggered: true, checkName: check.name, actions: check.actions ?? [] };
  }
  // OR
  for (const r of check.rules) {
    const res = await runRule(r, item, author);
    if (res.triggered) {
      return { triggered: true, checkName: check.name, actions: check.actions ?? [] };
    }
  }
  return { triggered: false, checkName: check.name, actions: [] };
}
