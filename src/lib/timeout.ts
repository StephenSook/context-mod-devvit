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

export async function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  errFactory: () => Error
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race<T>([
      p,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(errFactory()), ms);
      }),
    ]);
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
