import type { EventRecord } from './types';

const CSV_HEADER = ['ts', 'activityId', 'runName', 'checkName', 'actions', 'allOk'] as const;

// RFC 4180: rows separated by CRLF; UTF-8 BOM helps Excel locale detection.
const CRLF = '\r\n';
const UTF8_BOM = '\uFEFF';

// CSV-formula-injection prefixes per OWASP: =, +, -, @, tab (\t), CR (\r).
// Mitigation: prefix the cell with a single quote ' so Excel/Sheets/Numbers
// treat it as a string literal instead of evaluating it as a formula
// (Codex BLOCKER 2026-05-17). Apply to RAW value before quote-escape.
const DANGEROUS_PREFIXES = new Set(['=', '+', '-', '@', '\t', '\r']);

// Bypass-class chars per OWASP CSV-injection notes: leading whitespace + ASCII
// control + Unicode bidi controls + zero-width chars all get stripped by
// spreadsheet apps OR rendered invisibly, letting an attacker hide the formula
// prefix from a naive charAt(0) check. We strip these before checking the
// dangerous prefix so the formula trip-wire isn't bypassable. (Codex BLOCKER
// second-pass 2026-05-17 — first fix only guarded charAt(0) directly.)
//
// Built via new RegExp(string) so the source file stays ASCII-safe — embedding
// literal U+202E / zero-width chars in source breaks the TS parser.
//
// Class coverage:
//   \s                      ASCII whitespace
//   \u0000-\u001F          C0 control chars
//   \u200B-\u200F          zero-width space/non-joiner/joiner + LRM/RLM
//   \u2028-\u202F          line/paragraph sep + bidi controls + narrow no-break
//   \u2060-\u206F          word joiner + invisible + deprecated formatting
//   \uFEFF                  zero-width no-break space (BOM mid-string)
//
// C0 control range is INTENTIONAL per OWASP CSV-injection bypass coverage
// (must strip these from cell front so an attacker can't smuggle a formula
// behind invisible control chars).
/* eslint-disable no-control-regex */
const LEADING_STRIP_RE = new RegExp(
  '^[\\s\\u0000-\\u001F\\u200B-\\u200F\\u2028-\\u202F\\u2060-\\u206F\\uFEFF]+',
  'u',
);
/* eslint-enable no-control-regex */

export function actionMarker(
  status: 'ok' | 'skipped-locked' | 'dry-run' | 'error' | undefined,
  ok: boolean,
): string {
  if (status === 'dry-run') return '\u25C6';
  if (status === 'skipped-locked') return '\u2298';
  if (status === 'error') return '\u2717';
  if (status === 'ok') return '';
  return ok ? '' : '\u2717';
}

export function neutralizeCsvFormula(value: string): string {
  if (value.length === 0) return value;
  // Strip leading whitespace + control + bidi/zero-width chars and check if the
  // first VISIBLE char is dangerous. If yes, prefix the ORIGINAL value (preserve
  // presentation, just neutralize). Closes the U+202E RLO + leading-space bypass.
  const stripped = value.replace(LEADING_STRIP_RE, '');
  if (stripped.length === 0) return value;
  if (DANGEROUS_PREFIXES.has(stripped.charAt(0))) {
    return "'" + value;
  }
  return value;
}

function escapeCsvField(value: string): string {
  const safe = neutralizeCsvFormula(value);
  return `"${safe.replace(/"/g, '""')}"`;
}

export function eventsToCsv(events: EventRecord[]): string {
  const rows = events.map((e) =>
    [
      new Date(e.ts).toISOString(),
      e.activityId,
      e.runName ?? '',
      e.checkName ?? '',
      e.actions
        .map((a) => {
          const marker = actionMarker(a.status, a.ok);
          const wouldHave = a.wouldHaveCalled ? `(${a.wouldHaveCalled})` : '';
          return `${a.kind}${marker}${wouldHave}`;
        })
        .join(';'),
      e.actions.every((a) => a.ok) ? 'true' : 'false',
    ]
      .map((v) => escapeCsvField(String(v)))
      .join(','),
  );
  return UTF8_BOM + [CSV_HEADER.join(','), ...rows].join(CRLF);
}

export function csvFilename(subreddit: string, now: Date = new Date()): string {
  const safeSub = subreddit.replace(/[^a-zA-Z0-9_-]/g, '_');
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 16);
  return `contextmod-events-${safeSub}-${stamp}.csv`;
}
