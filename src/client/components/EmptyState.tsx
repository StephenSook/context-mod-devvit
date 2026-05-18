import { useState } from 'react';
import { Clipboard, Check } from 'lucide-react';
import { STARTER_CONFIG_SNIPPET } from '../lib/starter-snippet';

const COPY_RESET_MS = 2000;

export function EmptyState({ subreddit }: { subreddit: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(STARTER_CONFIG_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_RESET_MS);
    } catch {
      // navigator.clipboard unavailable in this iframe context — silent. The
      // user can still select-and-copy the visible <pre> block manually.
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-6 gap-3">
      <p className="text-bone-200 text-[13px]">Nothing has fired yet.</p>
      <p className="text-bone-300/80 text-[11px] font-serif italic leading-relaxed max-w-xs">
        Get started by pasting this into{' '}
        <span className="not-italic font-sans text-bone-200">
          r/{subreddit}/wiki/contextmod
        </span>
        .
      </p>

      <div className="relative w-full max-w-sm">
        <pre className="telemetry text-[10px] leading-snug text-bone-100 bg-ink-800/70 border border-line rounded px-3 py-2 overflow-x-auto text-left">
          <code>{STARTER_CONFIG_SNIPPET}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 telemetry text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-ink-950/70 border border-line text-bone-200 hover:text-bone-50 transition-colors"
          aria-label="Copy starter config to clipboard"
        >
          {copied ? (
            <>
              <Check size={10} strokeWidth={2} className="text-signal-ok" />
              <span className="text-signal-ok">copied</span>
            </>
          ) : (
            <>
              <Clipboard size={10} strokeWidth={1.8} />
              <span>copy</span>
            </>
          )}
        </button>
      </div>

      <div className="flex flex-col items-center gap-1 max-w-sm">
        <p className="text-bone-300/60 text-[10px] tracking-wide">
          Full schema + 11 example configs in{' '}
          <a
            href="https://github.com/StephenSook/context-mod-devvit/tree/main/examples"
            target="_top"
            rel="noreferrer"
            className="underline decoration-line hover:text-bone-50"
          >
            /examples
          </a>{' '}
          · events refresh every 10s
        </p>
        <p className="text-bone-300/50 text-[9.5px] tracking-wide">
          Stuck? Mod-menu →{' '}
          <span className="text-bone-200/80">ContextMod: Test rules on this item</span>{' '}
          runs a dry-run on any post or comment.
        </p>
      </div>
    </div>
  );
}
