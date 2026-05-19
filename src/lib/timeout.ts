/**
 * AE Polish #48 — shared Promise.race timeout primitive.
 *
 * Extracted from `src/core/handleActivity.ts` so `dryRunActivity.ts` (the
 * mod-menu sibling) can use the same primitive for per-run timeout parity
 * with the live orchestrator. Both files now have:
 *
 *   handleActivity:  runWithTimeout(runRun(...))   + actionWithTimeout(runAction(...))
 *   dryRunActivity:  runWithTimeout(runRun(...))
 *
 * Without the extraction, `dryRunActivity`'s hang vectors (e.g. an
 * imageRepost rule fetch that never returns inside a mod's "Test rules
 * on this item" form submit) would still stall the form indefinitely
 * even though `handleActivity` was hardened. Consistent timeout
 * semantics across both paths means a mod sees the same behavior
 * regardless of whether they're triggering via post-submit or mod-menu.
 *
 * Error classes are exported so callers can `instanceof` to differentiate
 * timeout from other failures in their error-handling branches.
 */

export const PER_RUN_TIMEOUT_MS = 10_000;
export const PER_ACTION_TIMEOUT_MS = 8_000;

export class RunTimeoutError extends Error {
  constructor(runName: string) {
    super(`run "${runName}" exceeded ${PER_RUN_TIMEOUT_MS}ms wall clock`);
    this.name = 'RunTimeoutError';
  }
}

export class ActionTimeoutError extends Error {
  constructor(actionKind: string) {
    super(`action "${actionKind}" exceeded ${PER_ACTION_TIMEOUT_MS}ms wall clock`);
    this.name = 'ActionTimeoutError';
  }
}

// Internal sentinel — used as the resolve-value of the timer-side promise.
// Picked as a fresh Symbol so it can never collide with any T the caller
// races against, even if T extends string/number/etc.
const TIMEOUT_SENTINEL: unique symbol = Symbol('cm/timeout/fired');

export async function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  errFactory: () => Error
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Polish #50: timer-side promise RESOLVES with a sentinel (not rejects)
  // so Promise.race never settles via a rejection path. This avoids
  // unhandled-rejection noise under vitest fake timers + Node strict
  // unhandled-rejection tracking. The error is thrown explicitly after
  // race settles, and the factory is still called at timeout-fire time
  // (preserving the stack-at-reject semantic).
  const timerPromise = new Promise<typeof TIMEOUT_SENTINEL>((resolve) => {
    timer = setTimeout(() => resolve(TIMEOUT_SENTINEL), ms);
  });
  try {
    const result = await Promise.race<T | typeof TIMEOUT_SENTINEL>([p, timerPromise]);
    if (result === TIMEOUT_SENTINEL) {
      throw errFactory();
    }
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function runWithTimeout<T>(p: Promise<T>, runName: string): Promise<T> {
  return withTimeout(p, PER_RUN_TIMEOUT_MS, () => new RunTimeoutError(runName));
}

export async function actionWithTimeout<T>(p: Promise<T>, kind: string): Promise<T> {
  return withTimeout(p, PER_ACTION_TIMEOUT_MS, () => new ActionTimeoutError(kind));
}
