/**
 * Status-aware chip rendering helpers (Codex session HIGH-2 propagation).
 *
 * Server's `RecentEvent.actions[]` carries `status: 'ok' | 'dry-run' | 'error'
 * | 'skipped-locked'` + optional `wouldHaveCalled` (per src/state/recentEvents.ts
 * post-Codex H2 fix). Until this module landed, the client rendered chips on
 * only the `ok` boolean — collapsing dry-run / error / skipped-locked into a
 * red-or-green binary. These helpers expose the full status surface so
 * EventRow can render distinct chip variants without leaking the color logic
 * into the JSX layer.
 *
 * Back-compat: undefined status (legacy ZSET events written pre-Codex-H2)
 * falls back to the ok boolean — same red/green behavior as before.
 */

import { SIGNAL } from './design-tokens';
import type { ActionKind } from './types';

const KIND_COLOR: Record<ActionKind, string> = {
  remove: SIGNAL.err,
  approve: SIGNAL.ok,
  lock: SIGNAL.warn,
  comment: SIGNAL.info,
  report: SIGNAL.warn,
  ban: SIGNAL.err,
  userFlair: SIGNAL.author,
};

export type ActionStatus = 'ok' | 'dry-run' | 'error' | 'skipped-locked';

/**
 * Pick the chip color for an action based on its status
 * + back-compat ok boolean (legacy).
 *
 * - status 'ok'             → action's kind color (KIND_COLOR[kind])
 * - status 'dry-run'        → SIGNAL.info (blue — informational, no side effect)
 * - status 'error'          → SIGNAL.err (red — action threw or commit failed)
 * - status 'skipped-locked' → SIGNAL.muted (gray — idempotency lock, already done)
 * - status undefined        → kind color if ok, else SIGNAL.err
 */
export function chipColorForStatus(
  status: ActionStatus | undefined,
  kind: ActionKind,
  ok: boolean
): string {
  if (status === 'dry-run') return SIGNAL.info;
  if (status === 'error') return SIGNAL.err;
  if (status === 'skipped-locked') return SIGNAL.muted;
  if (status === 'ok') return KIND_COLOR[kind];
  // Back-compat fallback (no status field — pre-Codex-H2 ZSET events).
  return ok ? KIND_COLOR[kind] : SIGNAL.err;
}

/**
 * Pick a short marker suffix for the chip label based on status.
 * Helps mods scan a dense event stream and spot non-ok action results.
 *
 * - 'ok'             → '' (no marker — green chip is enough)
 * - 'dry-run'        → ' ◆' (informational, no Reddit side-effect happened)
 * - 'error'          → ' ✗' (action threw or commit failed)
 * - 'skipped-locked' → ' ⊘' (idempotency lock — already done)
 * - undefined        → '✗' if !ok (legacy ZSET back-compat), '' if ok
 */
export function chipMarkerForStatus(status: ActionStatus | undefined, ok: boolean): string {
  if (status === 'dry-run') return ' ◆';
  if (status === 'error') return ' ✗';
  if (status === 'skipped-locked') return ' ⊘';
  if (status === 'ok') return '';
  // Back-compat fallback.
  return ok ? '' : '✗';
}
