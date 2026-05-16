/**
 * Config loader. JSON5 → AJV-validate → typed `AppConfig`.
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
import schema from '../schema/app.schema.json' with { type: 'json' };
import type { AppConfig } from '../shared/types';
import { expandNamedRules } from './namedRules';
import { computeNeedsAuthorEnrichment } from '../shared/normalize';

export type AjvError = ErrorObject;

export type ParseResult =
  | { ok: true; config: AppConfig }
  | { ok: false; errors: AjvError[] | string };

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile<AppConfig>(schema);

export function parseConfig(json5Text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON5.parse(json5Text);
  } catch (err) {
    return { ok: false, errors: `JSON5 parse error: ${(err as Error).message}` };
  }
  if (!validate(raw)) {
    return { ok: false, errors: validate.errors ?? [] };
  }
  const config = raw as AppConfig;
  const expanded = expandNamedRules(config);
  expanded.needsAuthorEnrichment = computeNeedsAuthorEnrichment(expanded);
  return { ok: true, config: expanded };
}
