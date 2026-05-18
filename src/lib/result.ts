/**
 * AC type-design refactor — shared Result<T, E> + helpers.
 *
 * Eight call sites across the codebase implemented the same
 * `{ok:true; value:T} | {ok:false; error:E}` shape ad-hoc:
 * ModAuthResult / ValidationResult / ExplainResult / LoadResult /
 * RateLimitResult / BreakerCheck (state-tagged variant) / MuteResult /
 * client-side LoadState. Consolidating to one definition removes the
 * duplication + gives a single home for the combinator helpers
 * (mapErr, chain, unwrapOr) that callers reach for.
 *
 * Existing call sites can adopt incrementally — the shape is
 * structurally compatible so a wholesale rewrite isn't needed. New
 * code should import from here.
 */

export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Transform the error variant without touching the success variant. */
export const mapErr = <T, E, F>(r: Result<T, E>, f: (e: E) => F): Result<T, F> =>
  r.ok ? r : err(f(r.error));

/** Transform the success variant; pass error through. */
export const mapOk = <T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E> =>
  r.ok ? ok(f(r.value)) : r;

/**
 * Monadic chain — apply f only if r is success; short-circuit on error.
 * Useful for sequencing fallible operations that share an error type.
 */
export const chain = <T, U, E>(
  r: Result<T, E>,
  f: (t: T) => Result<U, E>
): Result<U, E> => (r.ok ? f(r.value) : r);

/** Extract value or substitute fallback on error. */
export const unwrapOr = <T, E>(r: Result<T, E>, fallback: T): T =>
  r.ok ? r.value : fallback;

/** Extract value or throw the error (when caller is sure it's ok). */
export const unwrap = <T, E>(r: Result<T, E>): T => {
  if (r.ok) return r.value;
  throw r.error instanceof Error ? r.error : new Error(String(r.error));
};

/** Type guard for the success variant — useful in array filters. */
export const isOk = <T, E>(r: Result<T, E>): r is { ok: true; value: T } => r.ok;
export const isErr = <T, E>(r: Result<T, E>): r is { ok: false; error: E } =>
  !r.ok;
