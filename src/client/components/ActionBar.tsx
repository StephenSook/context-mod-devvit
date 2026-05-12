import { useState } from 'react';
import { RefreshCw, FileText, ExternalLink } from 'lucide-react';

const REPO_URL = 'https://github.com/StephenSook/context-mod-devvit';

export function ActionBar({ subreddit, onReload }: { subreddit: string; onReload: () => Promise<void> | void }) {
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

  const wikiUrl = `https://www.reddit.com/r/${subreddit}/wiki/contextmod`;

  return (
    <div
      className="cm-fade-up flex items-center justify-between px-5 py-3 border-t border-line"
      style={{ animationDelay: '0.7s' }}
    >
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
