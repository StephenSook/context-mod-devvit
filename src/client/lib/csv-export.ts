import type { EventRecord } from './types';

const CSV_HEADER = ['ts', 'activityId', 'runName', 'checkName', 'actions', 'allOk'] as const;

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

function escapeCsvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
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
  return [CSV_HEADER.join(','), ...rows].join('\n');
}

export function csvFilename(subreddit: string, now: Date = new Date()): string {
  const safeSub = subreddit.replace(/[^a-zA-Z0-9_-]/g, '_');
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 16);
  return `contextmod-events-${safeSub}-${stamp}.csv`;
}
