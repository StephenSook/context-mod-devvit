/**
 * Wave S Phase S1 — Rule simulation against recent activity.
 *
 * Lets a mod paste a proposed rule (JSON5) and see how often it would have
 * fired against the last N posts in their sub. No side-effects — pure prediction.
 *
 * Architecture:
 *   1. Parse the rule via parseConfig (wrapped as a minimal AppConfig with one
 *      run + one check holding the rule). Reuses the AJV validator + named-rule
 *      expander so the mod gets the same error messages as in production wiki.
 *   2. Sample N recent items (fetched fresh from reddit.getNewPosts by the
 *      route caller; core takes the samples as input for testability).
 *   3. For each sample, run runRule against the parsed Rule.
 *   4. Return aggregated breakdown.
 *
 * Non-contract: this does NOT call runRun / runCheck / runAction — it bypasses
 * combinators + filters + actions for a focused "would THIS RULE fire on these
 * items" answer. That's the question mods actually ask when prototyping.
 *
 * simulateFullConfig (added for /simulate-live fix): evaluates ALL runs in a
 * caller-supplied AppConfig against a sample set, in dry-run mode, with no
 * idempotency writes and no real Reddit side-effects. Used by the config-editor
 * Impact tab so the preview reflects the WHOLE config (not a single extracted rule).
 */

import type { Rule, Item, Author, AppConfig, Action } from '../shared/types';
import { parseConfig } from './config';
import { runRule } from './runRule';
import { runRun } from './runRun';
import { runAction } from './runAction';
import { runWithTimeout, RunTimeoutError } from '../lib/timeout';

export type SimulationSample = { item: Item; author: Author };

export type SimulationBreakdown = {
  activityId: string;
  triggered: boolean;
  errored: boolean;
};

export type SimulationResult =
  | {
      ok: true;
      totalSamples: number;
      firedCount: number;
      erroredCount: number;
      firstError?: string;
      breakdown: SimulationBreakdown[];
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Extract a single Rule from JSON5 input. Mods paste either a bare rule object
 * (`{kind: 'regex', ...}`) OR a full check (with `rules: [...]`). We accept both
 * and return the parsed Rule (first rule of first check if a check was pasted).
 */
function parseRuleInput(
  json5Text: string
): { ok: true; rule: Rule } | { ok: false; error: string } {
  // Wrap user's JSON5 as a minimal AppConfig for AJV reuse — gives the same
  // schema errors as production wiki edits.
  const wrappedJson5 = `{
    runs: [{
      name: 'simulation',
      checks: [{
        name: 'sim-check',
        combinator: 'OR',
        rules: [${json5Text}],
        actions: [{ kind: 'comment', template: 'simulation' }],
      }],
    }],
  }`;
  const parsed = parseConfig(wrappedJson5);
  if (!parsed.ok) {
    const errStr =
      typeof parsed.errors === 'string' ? parsed.errors : JSON.stringify(parsed.errors);
    return { ok: false, error: `Rule parse failed: ${errStr}` };
  }
  const rule = parsed.config.runs[0]?.checks[0]?.rules[0];
  if (!rule) {
    return { ok: false, error: 'No rule found in the input.' };
  }
  return { ok: true, rule };
}

export async function simulateRule(
  ruleJson5: string,
  samples: SimulationSample[],
  sub?: string
): Promise<SimulationResult> {
  const parsed = parseRuleInput(ruleJson5);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const breakdown: SimulationBreakdown[] = [];
  let firedCount = 0;
  let erroredCount = 0;
  let firstError: string | undefined;
  for (const sample of samples) {
    let triggered = false;
    let errored = false;
    try {
      const result = await runRule(parsed.rule, sample.item, sample.author, sub);
      triggered = result.triggered;
    } catch (err) {
      // Surface per-sample errors instead of silently marking triggered=false.
      // Without this, every-sample-throws looks like "0/25 fired" — mod thinks
      // the rule is safe when it's actually crashing.
      errored = true;
      erroredCount++;
      if (firstError === undefined) {
        firstError = err instanceof Error ? err.message : String(err);
      }
    }
    if (triggered) firedCount++;
    breakdown.push({ activityId: sample.item.id, triggered, errored });
  }

  return {
    ok: true,
    totalSamples: samples.length,
    firedCount,
    erroredCount,
    ...(firstError !== undefined ? { firstError } : {}),
    breakdown,
  };
}

/**
 * Evaluate a caller-supplied AppConfig against a set of samples in full dry-run
 * mode. Used by the config-editor /simulate-live endpoint so the Impact tab
 * previews the WHOLE config (runs + checks + actions) rather than a single
 * extracted rule.
 *
 * Dry-run contract:
 *   - Every action is forced to dryRun: true before dispatch.
 *   - bypassIdempotency: true skips reserveAction/commitAction Redis writes so
 *     Impact-tab polls never dirty the idempotency store.
 *   - No real Reddit side-effects are ever executed.
 *
 * firedCount = number of samples where at least one run triggered at least one
 * action. A sample that triggers multiple runs counts as 1.
 *
 * Mirrors the core loop of dryRunActivity but accepts an in-memory AppConfig
 * instead of reading from configStore, so it evaluates the editor's unsaved
 * buffer rather than the last-published config.
 */
export async function simulateFullConfig(
  config: AppConfig,
  samples: SimulationSample[],
  sub: string
): Promise<SimulationResult> {
  let firedCount = 0;
  let erroredCount = 0;
  let firstError: string | undefined;
  const breakdown: SimulationBreakdown[] = [];

  // Use rev 0 for the ActionContext: bypassIdempotency=true means the rev value
  // is never used in idempotency key generation (reserveAction is skipped).
  // Pass the in-memory config so dryRun=true propagates as the global gate.
  const ctxConfig: AppConfig = { ...config, dryRun: true };

  for (const sample of samples) {
    let triggered = false;
    let errored = false;
    try {
      for (const run of config.runs) {
        let result: Awaited<ReturnType<typeof runRun>>;
        try {
          result = await runWithTimeout(runRun(run, sample.item, sample.author, sub), run.name);
        } catch (err) {
          const isTimeout = err instanceof RunTimeoutError;
          const msg = err instanceof Error ? err.message : String(err);
          console.error(
            `[cm/simulateFullConfig] runRun ${isTimeout ? 'timed out' : 'threw'} — skipping run:`,
            run.name,
            err
          );
          if (firstError === undefined) firstError = msg.slice(0, 200);
          // Count this sample as errored once (even if multiple runs err).
          errored = true;
          continue;
        }
        if (!result.triggered) continue;

        // At least one run triggered; mark this sample as fired.
        triggered = true;

        // Dispatch actions in dry-run mode to verify the full pipeline fires
        // without executing any real Reddit side-effects.
        for (const action of result.actions) {
          const forcedDryRun: Action = { ...action, dryRun: true };
          await runAction(forcedDryRun, {
            item: sample.item,
            author: sample.author,
            subredditName: sub,
            rev: 0,
            config: ctxConfig,
            bypassIdempotency: true,
          });
        }
      }
    } catch (err) {
      errored = true;
      const msg = err instanceof Error ? err.message : String(err);
      if (firstError === undefined) firstError = msg.slice(0, 200);
    }

    if (errored) erroredCount++;
    if (triggered) firedCount++;
    breakdown.push({ activityId: sample.item.id, triggered, errored });
  }

  return {
    ok: true,
    totalSamples: samples.length,
    firedCount,
    erroredCount,
    ...(firstError !== undefined ? { firstError } : {}),
    breakdown,
  };
}

/**
 * Format the simulation result as a toast-friendly multi-line string.
 * Mods see the percent + the 3 sample IDs that would have fired (for context).
 */
export function formatSimulationToast(result: SimulationResult): string {
  if (!result.ok) {
    return result.error.slice(0, 400);
  }
  if (result.totalSamples === 0) {
    return 'No recent posts to simulate against. Try after some activity.';
  }
  const pct = Math.round((result.firedCount / result.totalSamples) * 100);
  const samples = result.breakdown
    .filter((b) => b.triggered)
    .slice(0, 3)
    .map((b) => b.activityId);
  const sampleLine = samples.length > 0 ? ` Examples: ${samples.join(', ')}` : '';
  // Surface errored samples so mod knows the rule crashed rather than just
  // didn't match. Without this, an erroring rule looks safe.
  const errorLine =
    result.erroredCount > 0
      ? ` ⚠ ${result.erroredCount} sample${result.erroredCount === 1 ? '' : 's'} errored${result.firstError ? `: ${result.firstError.slice(0, 100)}` : ''}.`
      : '';
  return `Rule would fire on ${result.firedCount}/${result.totalSamples} (${pct}%) recent items.${sampleLine}${errorLine}`;
}
