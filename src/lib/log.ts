/**
 * X33: structured JSON logger. Replaces ad-hoc `console.log('[cm/api] ...', err)`
 * pattern with a single emit shape so external log aggregators (Datadog,
 * Honeycomb, plain `jq`) can filter/group consistently.
 *
 * Emit shape:
 *   { ts: 1747526400000, level: "error", tag: "cm/api/explain-event",
 *     msg: "openai failed", err: "ECONNRESET", ...ctx }
 *
 * `tag` is the canonical [cm/area/handler] prefix; `ctx` is any number of
 * key-value pairs the caller wants surfaced (status, sub, eventId, etc).
 * Underlying transport remains console.log (Devvit's log surface) — the
 * structure just gives the bytes downstream parseability.
 */

type Level = 'info' | 'warn' | 'error';
type Ctx = Record<string, unknown>;

/**
 * Y2-X35: per-request trace ID. Generate once at request entry, attach to
 * the log context, propagate through the call stack so every line for that
 * request shares the same `traceId`. Aggregators can pivot on the field to
 * reconstruct the full path of an event.
 *
 * Cheap: `crypto.randomUUID()` returns a stable v4 string. No persistence.
 */
export function newTraceId(): string {
  return crypto.randomUUID();
}

function emit(level: Level, tag: string, msg: string, ctx?: Ctx): void {
  // Spread ctx FIRST so the structured fields (ts/level/tag/msg) can't be
  // shadowed by a caller passing those keys in ctx.
  const payload: Record<string, unknown> = {
    ...(ctx ?? {}),
    ts: Date.now(),
    level,
    tag,
    msg,
  };
  if (ctx?.err instanceof Error) {
    payload.err = ctx.err.message;
    payload.errName = ctx.err.name;
  }
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  info: (tag: string, msg: string, ctx?: Ctx) => emit('info', tag, msg, ctx),
  warn: (tag: string, msg: string, ctx?: Ctx) => emit('warn', tag, msg, ctx),
  error: (tag: string, msg: string, ctx?: Ctx) => emit('error', tag, msg, ctx),
  newTraceId,
};
