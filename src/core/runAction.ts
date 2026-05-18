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

/**
 * Stable payload digest fed into actionId. Keeps the hash deterministic across
 * runs of the same config rev so retries collide with the prior attempt.
 * Per-action fields included here are the ones that change the side-effect
 * (e.g. ban duration, comment template) — dryRun is intentionally excluded so a
 * dry-run and a real run for the same logical action collide on the `done` marker.
 */
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
  }
}

export async function runAction(action: Action, ctx: ActionContext): Promise<ActionResult> {
  // Dry-run gate (Phase 2.5). Global config.dryRun is AUTHORITATIVE — per-action
  // can only ELEVATE to dry-run, never demote a globally-safe config to live.
  // OR (not ??) so a per-action dryRun:false cannot override a global dryRun:true.
  // override config.dryRun: true (catastrophic safety-gate bypass).
  const dry = ctx.config.dryRun === true || action.dryRun === true;
  if (dry) {
    return {
      status: 'dry-run',
      kind: action.kind,
      wouldHaveCalled: action.kind,
    };
  }

  const aid = actionId(ctx.item.id, action.kind, payloadDigest(action));
  const reservation = await reserveAction(aid, ctx.subredditName);
  if (!reservation) {
    return { status: 'skipped-locked', kind: action.kind };
  }
  const { token } = reservation;

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
