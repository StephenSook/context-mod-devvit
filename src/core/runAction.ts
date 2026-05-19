/**
 * Action dispatcher (Step 2.1).
 *
 * Wraps every action with `reserveAction → side-effect → commitAction/releaseAction`
 * per D4. The action ID MUST come from the exported `actionId(thingId, actionType, payload)`
 * helper at src/lib/idem.ts:123 — pipe-separated. Hand-rolling concat collides on inputs
 * like ('t3_a','ban','x') vs ('t3_ab','an','x') and lets an attacker alias another user's
 * already-committed action to bypass `reserveAction`.
 *
 * Critical ordering: reserveAction → side-effect → (success: commitAction) / (failure: releaseAction).
 *
 * Stale-lease handling (Council fix, Software Lead): when `reserveAction` returns false
 * because of a 5-min `pending` lease from a prior crash, return an explicit
 * `{ status: 'skipped-locked' }` so handleActivity can record it in the event log
 * instead of dropping silently.
 *
 * Dry-run gate (Phase 2.5): a per-action `dryRun` overrides the config-level
 * `ctx.config.dryRun`. When either is true, no Reddit side-effect is called;
 * we still write the `done` marker so retries don't refire.
 *
 * AE CRITICAL #7 fix: previously the dryRun gate short-circuited BEFORE
 * reserveAction — meaning dry-run calls NEVER wrote the done marker even
 * though the docstring promised they did. Result: if a Devvit retry of the
 * same trigger landed (or firstSeen fail-open let a duplicate through), the
 * action would re-fire in live mode after the dryRun→false toggle. Now
 * dry-run STILL goes through reserveAction + commitAction (writing the done
 * marker so retries skip) but the Reddit side-effect itself is skipped.
 * Matches the long-standing docstring intent at lines 36-38.
 */

import type { Action, ActionContext, ActionResult } from '../shared/types';
import { actionId, reserveAction, commitAction, releaseAction } from '../lib/idem';
import { runRemove } from '../actions/remove';
import { runApprove } from '../actions/approve';
import { runComment } from '../actions/comment';
import { runLock } from '../actions/lock';
import { runReport } from '../actions/report';
import { runBan } from '../actions/ban';
import { runUserFlair } from '../actions/userFlair';
import { runDistinguish } from '../actions/distinguish';

/**
 * Stable payload digest fed into actionId. Keeps the hash deterministic across
 * runs of the same config rev so retries collide with the prior attempt.
 * Per-action fields included here are the ones that change the side-effect
 * (e.g. ban duration, comment template) — dryRun is intentionally excluded so a
 * dry-run and a real run for the same logical action collide on the `done` marker.
 */
// AE Polish #82: gemini brutal-audit P2-1. Distinguish RETRYABLE failures
// (network blip, Reddit 5xx, transient rate-limit) from NON-RETRYABLE
// failures (deterministic 4xx: post already removed, comment locked,
// target user already banned). Pre-Polish, the catch at runAction:182
// always called releaseAction → next event for the same activity would
// retry the action against a target that will deterministically fail
// the same way. Worst case: the pending TTL (5min) gates the retry, so
// it's not infinite — but a mod editing the wiki to fix a misconfigured
// rule had to wait out a 5min cooldown per actioned-thing.
//
// New behavior: on a non-retryable error, call commitAction (seal the
// slot — done, no retry needed) instead of releaseAction. The action
// recorded as status:'error' either way so the dashboard surfaces the
// failure; the slot-seal just means we don't re-attempt a doomed call.
//
// Detection heuristic: Devvit's Reddit client errors carry message
// strings derived from upstream HTTP responses. Match conservative
// keywords that always indicate "this action will never succeed for
// this target." When in doubt → retryable (preserves pre-Polish
// safer-default behavior). False-positives (treating a retryable error
// as non-retryable) cost ONE failed retry; false-negatives (treating
// a non-retryable error as retryable) cost up to 5min of pending lease
// + log noise. The keywords below are the conservative subset.
const NON_RETRYABLE_PATTERNS = [
  /\balready (removed|approved|locked|banned|distinguished|reported)\b/i,
  /\b(post|comment|user|thing) (not found|does not exist|deleted)\b/i,
  /\bHTTP 40[0-9]\b/, // generic 4xx fallback
  /\b40[03-4]\s/, // 400 / 403 / 404 with trailing space (status-line shape)
  /\bforbidden\b/i,
  /\bunauthorized\b/i,
];

function isNonRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return NON_RETRYABLE_PATTERNS.some((p) => p.test(msg));
}

function payloadDigest(a: Action): string {
  switch (a.kind) {
    case 'remove':
      return `spam=${a.isSpam ?? false}`;
    case 'approve':
      return '';
    case 'comment':
      return `tpl=${a.template}`;
    case 'lock':
      return '';
    case 'report':
      return `reason=${a.reason}`;
    case 'ban':
      return `dur=${a.duration ?? 0}|reason=${a.reason ?? ''}|note=${a.note ?? ''}`;
    case 'userFlair':
      return `text=${a.text ?? ''}|css=${a.cssClass ?? ''}`;
    case 'distinguish':
      return `sticky=${a.sticky ?? false}`;
  }
}

export async function runAction(action: Action, ctx: ActionContext): Promise<ActionResult> {
  // Dry-run gate (Phase 2.5). Global config.dryRun is AUTHORITATIVE — per-action
  // can only ELEVATE to dry-run, never demote a globally-safe config to live.
  // OR (not ??) so a per-action dryRun:false cannot override a global dryRun:true.
  // override config.dryRun: true (catastrophic safety-gate bypass).
  const dry = ctx.config.dryRun === true || action.dryRun === true;

  // AE CRITICAL #7: bypass-idempotency path (mod-menu dryRunActivity).
  // Skip both reserveAction AND commitAction — the mod-menu sibling has
  // no retry concern and needs to be repeatable (mod hitting "Test rules
  // on this item" 10 times should see the same trace each time).
  if (ctx.bypassIdempotency) {
    if (!dry) {
      // Defense-in-depth: bypassIdempotency should only ever be set
      // alongside dry-run by the mod-menu path. A live action with
      // bypassIdempotency=true would be a catastrophic safety violation
      // (no double-action protection). Force dry-run downgrade.
      console.error(
        '[cm/runAction] bypassIdempotency=true with live action — refusing to fire side-effect',
        action.kind,
        ctx.item.id
      );
    }
    return {
      status: 'dry-run',
      kind: action.kind,
      wouldHaveCalled: action.kind,
    };
  }

  // AE CRITICAL #7: production path — reserve BEFORE branching on dry-run
  // so the done marker is written either way. Without this, a retry that
  // lands after a dryRun→false toggle would re-fire the action (no marker
  // = "never done" from idem.ts's perspective). reservation==null means a
  // prior attempt (dry-run or live) already locked or completed this
  // actionId — surface as skipped-locked just like the live path.
  const aid = actionId(ctx.item.id, action.kind, payloadDigest(action));
  const reservation = await reserveAction(aid, ctx.subredditName);
  if (!reservation) {
    return { status: 'skipped-locked', kind: action.kind };
  }
  const { token } = reservation;

  // Dry-run path (production): skip the Reddit side-effect but STILL commit
  // the done marker so retries (Devvit re-delivery, firstSeen fail-open)
  // don't re-fire. commitAction failure here is non-fatal (the action
  // didn't actually happen — at worst the marker won't be written and a
  // retry re-dry-runs, which is idempotent in observable Reddit state).
  if (dry) {
    try {
      await commitAction(aid, token, ctx.subredditName);
    } catch (err) {
      console.warn(
        '[cm/runAction] dry-run commitAction failed (harmless, retry will re-dry-run):',
        action.kind,
        ctx.item.id,
        err
      );
    }
    return {
      status: 'dry-run',
      kind: action.kind,
      wouldHaveCalled: action.kind,
    };
  }

  let sideEffectDone = false;
  try {
    switch (action.kind) {
      case 'remove':
        await runRemove(action, ctx);
        break;
      case 'approve':
        await runApprove(action, ctx);
        break;
      case 'comment':
        await runComment(action, ctx);
        break;
      case 'lock':
        await runLock(action, ctx);
        break;
      case 'report':
        await runReport(action, ctx);
        break;
      case 'ban':
        await runBan(action, ctx);
        break;
      case 'userFlair':
        await runUserFlair(action, ctx);
        break;
      case 'distinguish':
        await runDistinguish(action, ctx);
        break;
    }
    sideEffectDone = true;
    await commitAction(aid, token, ctx.subredditName);
    return { status: 'ok', kind: action.kind };
  } catch (err) {
    if (sideEffectDone) {
      // Side-effect succeeded but commitAction threw on
      // done-marker write failure. Pending lease was NOT released by
      // commitAction (intentional — prevents instant double-action). Surface
      // as 'error' so dashboard shows red + mod investigates. NOT releaseAction:
      // releasing would reopen the gate and cause double-action on retry.
      console.error(
        '[cm/runAction] side-effect succeeded but idempotency commit failed:',
        action.kind,
        ctx.item.id,
        err
      );
      return { status: 'error', kind: action.kind };
    }
    // AE Polish #82: distinguish retryable vs non-retryable Reddit errors.
    if (isNonRetryableError(err)) {
      // Deterministic 4xx: post already removed / comment not found /
      // user already banned / forbidden. Retrying would deterministically
      // fail the same way. Seal the slot via commitAction so the next
      // event for the same activity doesn't waste the 5-min pending TTL
      // re-attempting. Side-effect didn't happen (sideEffectDone is
      // false here) but committing is still correct because the failure
      // is permanent for this {thingId, action, payload} key.
      try {
        await commitAction(aid, token, ctx.subredditName);
      } catch (commitErr) {
        // commitAction failure here is harmless — the pending lease will
        // self-expire in 5min and a retry can proceed. Worst case
        // identical to pre-Polish-#82 behavior (5min retry wait).
        console.warn(
          '[cm/runAction] non-retryable err — commitAction failed (harmless, pending TTL will reap):',
          action.kind,
          commitErr
        );
      }
      console.error(
        '[cm/runAction] non-retryable err — sealed slot, no retry:',
        action.kind,
        ctx.item.id,
        err
      );
      return { status: 'error', kind: action.kind };
    }
    await releaseAction(aid, token, ctx.subredditName);
    console.error(
      '[cm/runAction] action failed, released for retry:',
      action.kind,
      ctx.item.id,
      err
    );
    return { status: 'error', kind: action.kind };
  }
}
