import type { EventRecord } from './types';

const CSV_HEADER = ['ts', 'activityId', 'runName', 'checkName', 'actions', 'allOk'] as const;

// RFC 4180: rows separated by CRLF; UTF-8 BOM helps Excel locale detection.
const CRLF = '\r\n';
const UTF8_BOM = '﻿';

// CSV-formula-injection prefixes per OWASP: =, +, -, @, tab (\t), CR (\r).
// Mitigation: prefix the cell with a single quote ' so Excel/Sheets/Numbers
// treat it as a string literal instead of evaluating it as a formula
// (Codex BLOCKER 2026-05-17). Apply to RAW value before quote-escape.
const DANGEROUS_PREFIXES = new Set(['=', '+', '-', '@', '\t', '\r']);

export function actionMarker(
  status: 'ok' | 'skipped-locked' | 'dry-run' | 'error' | undefined,
  ok: boolean,
): string {
  if (status === 'dry-run') return '◆';
  if (status === 'skipped-locked') return '⊘';
  if (status === 'error') return '✗';
  if (status === 'ok') return '';
  return ok ? '' : '✗';
}

export function neutralizeCsvFormula(value: string): string {
  if (value.length === 0) return value;
  if (DANGEROUS_PREFIXES.has(value.charAt(0))) {
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
