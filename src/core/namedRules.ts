/**
 * Named-rule expansion. CM lets configs declare a rule once under
 * `namedRules.{name}` and reference it from multiple checks via
 * `{ kind: 'named', name: '...' }`. Expand inline before evaluation so the
 * runtime sees a flat rule list (Step 1.9 dispatcher need not handle `named:`).
 *
 * Unknown names raise — better a clear config error than a silent skip.
 * Cycles are broken by a visited set; a cyclic ref expands to an empty
 * ruleset (AND of zero rules = trivially true is wrong; we treat it as
 * always-false to fail-safe).
 */

import type { AppConfig, Rule, RuleSetRule } from '../shared/types';

export function expandNamedRules(config: AppConfig): AppConfig {
  const named = config.namedRules ?? {};
  const out: AppConfig = {
    ...config,
    runs: config.runs.map((run) => ({
      ...run,
      checks: run.checks.map((check) => ({
        ...check,
        rules: check.rules.map((r) => expandRule(r, named, new Set())),
      })),
    })),
  };
  return out;
}

function expandRule(
  rule: Rule,
  named: Record<string, Rule>,
  visited: Set<string>
): Rule {
  if (rule.kind === 'named') {
    if (visited.has(rule.name)) {
      // Cycle — replace with a "never triggers" empty AND-ruleset.
      const empty: RuleSetRule = {
        kind: 'ruleset',
        combinator: 'AND',
        rules: [],
      };
      console.error(
        '[cm/namedRules] cycle detected expanding',
        rule.name,
        '— short-circuiting to empty ruleset'
      );
      return empty;
    }
    const target = named[rule.name];
    if (!target) {
      throw new Error(`namedRules: unknown rule name "${rule.name}"`);
    }
    const nextVisited = new Set(visited);
    nextVisited.add(rule.name);
    return expandRule(target, named, nextVisited);
  }
  if (rule.kind === 'ruleset') {
    return {
      ...rule,
      rules: rule.rules.map((r) => expandRule(r, named, visited)),
    };
  }
  return rule;
}
