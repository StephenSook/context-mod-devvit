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

function emit(level: Level, tag: string, msg: string, ctx?: Ctx): void {
  const payload: Record<string, unknown> = {
    ts: Date.now(),
    level,
    tag,
    msg,
    ...(ctx ?? {}),
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
};
