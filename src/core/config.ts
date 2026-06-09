/**
 * Config loader. JSON5 or YAML → AJV-validate → typed `AppConfig`.
 *
 * Format support:
 * - JSON5 (FoxxMD upstream supported it, Devvit port shipped it first)
 * - YAML (FoxxMD Discord 2026-05-20: "cm also supports yaml which is what
 *   most mods use since it's the same syntax as automod"). Polish #136
 *   added YAML alongside JSON5 so existing CM operators can paste their
 *   existing AutoMod-style YAML configs directly into the wiki page
 *   without converting first.
 *
 * Detection strategy: sniff first non-whitespace character. `{` or `[`
 * means flow-style JSON5; anything else means YAML. On detected-format
 * parse failure, fall back to the other parser so a leading-comment
 * JSON5 file (e.g. `// header\n{...}`) or a quoted-scalar YAML file
 * still parses correctly.
 *
 * Step 1.7's named-rule expansion runs here too so the engine only ever sees
 * a flat rule graph (Step 1.9 dispatcher doesn't need to know about `named:`
 * refs).
 *
 * `needsAuthorEnrichment` is computed at parse time so per-event normalization
 * (Step 1.3) can short-circuit the expensive `reddit.getUserByUsername` call
 * on configs that don't need it.
 */

import Ajv, { type ErrorObject } from 'ajv';
import JSON5 from 'json5';
import YAML from 'js-yaml';
import schema from '../schema/app.schema.json' with { type: 'json' };
import type { AppConfig } from '../shared/types';
import { expandNamedRules } from './namedRules';
import { computeNeedsAuthorEnrichment } from '../shared/normalize';

export type AjvError = ErrorObject;

export type ParseResult =
  | { ok: true; config: AppConfig; format: 'json5' | 'yaml' }
  | { ok: false; errors: AjvError[] | string };

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile<AppConfig>(schema);

function sniffFormat(text: string): 'json5' | 'yaml' {
  const trimmed = text.trimStart();
  return trimmed.startsWith('{') || trimmed.startsWith('[') ? 'json5' : 'yaml';
}

function tryJson5(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON5.parse(text) };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

function tryYaml(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    // js-yaml v4 default schema: CORE_SCHEMA (no !!js/* unsafe types).
    // YAML.load returns undefined for empty document, which AJV will
    // reject as not-an-object; that's the right behavior here.
    return { ok: true, value: YAML.load(text) };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Normalize an upstream-ContextMod-shaped config toward our internal shape
 * BEFORE AJV validation. ContextMod's Schema/App.json names a few check fields
 * differently or nests them where ours does not:
 *   - `condition` (AND/OR) is our `combinator`.
 *   - check-level `itemIs` / `authorIs` are our nested `filters.{itemIs,authorIs}`.
 * A missing combinator defaults to AND (upstream marks it required, but a check
 * is unambiguous without it). `enable`, `description`, and `kind` are accepted
 * natively by the schema and honored in runCheck, so they pass through. Mutates
 * `raw` in place. Genuinely unsupported fields are LEFT for AJV to reject with a
 * clear "additional property" error rather than silently dropped — a moderator
 * must know when a field is being ignored. 2026-06-09, SampleOfNone feedback.
 */
function normalizeUpstreamShape(raw: Record<string, unknown>): void {
  const runs = raw.runs;
  if (!Array.isArray(runs)) return;
  for (const run of runs) {
    if (!run || typeof run !== 'object') continue;
    const checks = (run as { checks?: unknown }).checks;
    if (!Array.isArray(checks)) continue;
    for (const check of checks) {
      if (!check || typeof check !== 'object') continue;
      const c = check as Record<string, unknown>;

      // upstream `condition` (AND/OR) -> our `combinator`. A recognized value is
      // consumed (mapped + alias removed). An UNRECOGNIZED `condition` is LEFT in
      // place so AJV rejects it with a clear "additional property" error rather
      // than silently coercing the check to AND — a silent semantic flip (OR->AND)
      // would change moderation behavior without telling the operator.
      if (c.combinator != null) {
        // native shape (or both supplied) — combinator wins; drop any alias
        delete c.condition;
      } else if (typeof c.condition === 'string') {
        const cond = c.condition.toUpperCase();
        if (cond === 'AND' || cond === 'OR' || cond === 'NOT') {
          c.combinator = cond;
          delete c.condition; // consumed
        }
        // unrecognized string: leave c.condition -> AJV surfaces the error
      } else if (c.condition === undefined) {
        // neither combinator nor condition supplied -> unambiguous default
        c.combinator = 'AND';
      }
      // (condition present but non-string -> left in place -> AJV rejects)

      // upstream check-level itemIs/authorIs -> our nested filters.{itemIs,authorIs}
      if (c.itemIs != null || c.authorIs != null) {
        const filters =
          c.filters != null && typeof c.filters === 'object'
            ? (c.filters as Record<string, unknown>)
            : {};
        if (c.itemIs != null && filters.itemIs == null) filters.itemIs = c.itemIs;
        if (c.authorIs != null && filters.authorIs == null) filters.authorIs = c.authorIs;
        c.filters = filters;
        delete c.itemIs;
        delete c.authorIs;
      }
    }
  }
}

export function parseConfig(text: string): ParseResult {
  const detected = sniffFormat(text);
  // Try detected format first. On failure, try the other so leading-comment
  // edge cases (e.g. `# yaml-style header\n{...}` or `// json5-header\nkey: val`)
  // still parse via the correct backend.
  let raw: unknown;
  let format: 'json5' | 'yaml';
  if (detected === 'json5') {
    const j = tryJson5(text);
    if (j.ok) {
      raw = j.value;
      format = 'json5';
    } else {
      const y = tryYaml(text);
      if (y.ok) {
        raw = y.value;
        format = 'yaml';
      } else {
        return { ok: false, errors: `JSON5 parse error: ${j.error}` };
      }
    }
  } else {
    const y = tryYaml(text);
    if (y.ok) {
      raw = y.value;
      format = 'yaml';
    } else {
      const j = tryJson5(text);
      if (j.ok) {
        raw = j.value;
        format = 'json5';
      } else {
        return { ok: false, errors: `YAML parse error: ${y.error}` };
      }
    }
  }

  // YAML.load returns string / number / null / array for non-object inputs
  // (e.g. `"this is not json"` parses as a bare string scalar). JSON5.parse
  // can also return primitive values. The config schema requires an object
  // at root; surface that as a parse error (string envelope) rather than an
  // AJV failure (array envelope) so callers get a readable message.
  if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      errors: `${format === 'yaml' ? 'YAML' : 'JSON5'} root must be an object, got ${
        raw === null ? 'null' : Array.isArray(raw) ? 'array' : typeof raw
      }`,
    };
  }

  // Map upstream ContextMod check shape onto ours before validating, so real
  // ContextMod configs validate instead of tripping additionalProperties.
  normalizeUpstreamShape(raw as Record<string, unknown>);

  if (!validate(raw)) {
    return { ok: false, errors: validate.errors ?? [] };
  }
  const config = raw as AppConfig;
  // expandNamedRules throws on unknown refs (cycles
  // are short-circuited but unresolved names raise). AJV can't catch
  // "named ref X doesn't exist" because the schema only enforces shape.
  // Wrap so callers get a structured ParseResult instead of a 500.
  let expanded: AppConfig;
  try {
    expanded = expandNamedRules(config);
  } catch (err) {
    return {
      ok: false,
      errors: `Named-rule expansion failed: ${(err as Error).message}`,
    };
  }
  expanded.needsAuthorEnrichment = computeNeedsAuthorEnrichment(expanded);
  return { ok: true, config: expanded, format };
}
