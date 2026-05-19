import { useState, useEffect, useRef } from 'react';
import { Clipboard, Check } from 'lucide-react';
import { STARTER_CONFIG_SNIPPET } from '../lib/starter-snippet';

const COPY_RESET_MS = 2000;

export function EmptyState({ subreddit }: { subreddit: string }) {
  const [copied, setCopied] = useState(false);
  // AE Polish #84: gemini brutal-audit P2-5. Pre-Polish, clipboard
  // failure was silently swallowed — mod clicks "copy", browser refuses
  // (iframe perm-denied is common in Safari + Firefox strict-tracking
  // modes), nothing happens, no UX feedback. Track explicit failure
  // state so the button can flip to "copy unavailable" + the user
  // knows to select-and-copy from the visible <pre> block manually.
  const [copyFailed, setCopyFailed] = useState(false);
  // AE Polish #39: track the copy-reset timeout so a rapid second click
  // cancels the pending reset (cleaner UX) AND so an unmount during the
  // 2s window (which CAN happen — poll lands w/ new events → events.
  // length>0 → EmptyState unmounts) doesn't fire setState on an
  // unmounted component (React 18 warning).
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(STARTER_CONFIG_SNIPPET);
      setCopied(true);
      setCopyFailed(false);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, COPY_RESET_MS);
    } catch (err) {
      // AE Polish #84: explicit failure UX instead of silent swallow.
      // Common cause: webview iframe lacks clipboard-write permission
      // (Safari + Firefox enhanced tracking by default; some Reddit
      // mobile webview configurations as well). Surface as "copy
      // unavailable" + log so it's visible in dev tools.
      console.warn('[cm/EmptyState] clipboard.writeText failed — manual select required:', err);
      setCopied(false);
      setCopyFailed(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopyFailed(false);
        copyTimerRef.current = null;
      }, COPY_RESET_MS);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-6 gap-3">
      <p className="text-bone-200 text-[13px]">Nothing has fired yet.</p>
      <p className="text-bone-300/80 text-[11px] font-serif italic leading-relaxed max-w-xs">
        Get started by pasting this into{' '}
        <span className="not-italic font-sans text-bone-200">r/{subreddit}/wiki/botconfig/contextmod</span>.
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
          ) : copyFailed ? (
            <>
              {/* Polish #84: explicit failure UX. iframe clipboard
                  perm-denied is the common path (Safari, Firefox
                  enhanced tracking, some Reddit mobile webviews). The
                  visible <pre> block above is still selectable so the
                  mod can copy manually. */}
              <Clipboard size={10} strokeWidth={1.8} className="text-signal-warn" />
              <span className="text-signal-warn">select manually</span>
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
          <span className="text-bone-200/80">ContextMod: Test rules on this item</span> runs a
          dry-run on any post or comment.
        </p>
      </div>
    </div>
  );
}
