import { useState } from 'react';
import { RefreshCw, FileText, ExternalLink, Download } from 'lucide-react';
import type { EventRecord } from '../lib/types';

const REPO_URL = 'https://github.com/StephenSook/context-mod-devvit';

function eventsToCsv(events: EventRecord[]): string {
  const header = ['ts', 'activityId', 'runName', 'checkName', 'actions', 'allOk'];
  const rows = events.map((e) =>
    [
      new Date(e.ts).toISOString(),
      e.activityId,
      e.runName ?? '',
      e.checkName ?? '',
      e.actions.map((a) => `${a.kind}${a.ok ? '' : '✗'}`).join(';'),
      e.actions.every((a) => a.ok) ? 'true' : 'false',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  );
  return [header.join(','), ...rows].join('\n');
}

function downloadCsv(events: EventRecord[], subreddit: string) {
  const csv = eventsToCsv(events);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  a.download = `contextmod-events-${subreddit}-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ActionBar({
  subreddit,
  onReload,
  events,
}: {
  subreddit: string;
  onReload: () => Promise<void> | void;
  events: EventRecord[];
}) {
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const handleReload = async () => {
    if (busy) return;
    setBusy(true);
    setFlash(null);
    try {
      await onReload();
      setFlash('refreshed');
      setTimeout(() => setFlash(null), 1500);
    } finally {
      setBusy(false);
    }
  };

  const handleExport = () => {
    if (events.length === 0) return;
    downloadCsv(events, subreddit);
    setFlash('exported');
    setTimeout(() => setFlash(null), 1500);
  };

  const wikiUrl = `https://www.reddit.com/r/${subreddit}/wiki/contextmod`;
  const exportDisabled = events.length === 0;

  return (
    <div
      className="cm-fade-up flex items-center justify-between px-5 py-3 border-t border-line"
      style={{ animationDelay: '0.7s' }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={handleReload}
          disabled={busy}
          className="group inline-flex items-center gap-1.5 text-[11px] text-bone-200 hover:text-bone-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw
            size={12}
            strokeWidth={1.8}
            className={busy ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}
          />
          <span className="tracking-wide">
            {flash === 'refreshed' ? <span className="text-signal-ok">refreshed</span> : 'Reload config'}
          </span>
        </button>

        <button
          onClick={handleExport}
          disabled={exportDisabled}
          title={exportDisabled ? 'No events to export yet' : `Download last ${events.length} as CSV`}
          className="group inline-flex items-center gap-1.5 text-[11px] text-bone-200 hover:text-bone-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={12} strokeWidth={1.8} />
          <span className="tracking-wide">
            {flash === 'exported' ? <span className="text-signal-ok">downloaded</span> : 'Export CSV'}
          </span>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <a
          href={wikiUrl}
          target="_top"
          rel="noreferrer"
          className="group inline-flex items-center gap-1.5 text-[11px] text-bone-300 hover:text-bone-50 transition-colors"
        >
          <FileText size={12} strokeWidth={1.8} />
          <span>Wiki</span>
        </a>
        <a
          href={REPO_URL}
          target="_top"
          rel="noreferrer"
          className="group inline-flex items-center gap-1.5 text-[11px] text-bone-300 hover:text-bone-50 transition-colors"
        >
          <ExternalLink size={12} strokeWidth={1.8} />
          <span>Docs</span>
        </a>
      </div>
    </div>
  );
}
