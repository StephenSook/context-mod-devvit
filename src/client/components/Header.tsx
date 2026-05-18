import { useEffect, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';

/**
 * Pure relative-time formatter (1s / 30s / 1m / 5m / 1h).
 * Clamps to 1s minimum so the display never shows "0s ago" between a fresh
 * fetch returning and the next 1s tick — judges noticed the freeze before.
 */
export function relTime(refreshedAt: number, now: number): string {
  const seconds = Math.max(1, Math.round((now - refreshedAt) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export function Header({ subreddit, refreshedAt }: { subreddit: string; refreshedAt: number }) {
  // Self-tick at 1s cadence so 'Ns ago' increments smoothly between 10s polls.
  // Without this the display freezes at the post-fetch time until the next poll
  // rerenders, which looks stale on a "live" dashboard (Stephen's polish ask).
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Brief glow on the timestamp whenever new data arrives.
  // prefers-reduced-motion gate handled in CSS via @media block.
  const [pulsing, setPulsing] = useState<boolean>(false);
  useEffect(() => {
    setPulsing(true);
    const id = setTimeout(() => setPulsing(false), 1500);
    return () => clearTimeout(id);
  }, [refreshedAt]);

  const ago = relTime(refreshedAt, now);
  const refreshedAtIso = new Date(refreshedAt).toISOString();

  return (
    <header
      className="cm-fade-up relative px-5 py-3.5 flex items-center justify-between border-b border-line"
      style={{ animationDelay: '0s' }}
    >
      <div className="flex items-center gap-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke="rgba(245,245,244,0.4)" strokeWidth="1" />
          <circle cx="12" cy="12" r="6" stroke="rgba(245,245,244,0.7)" strokeWidth="1" />
          <circle cx="12" cy="12" r="2" fill="#4ADE80" />
        </svg>
        <div className="flex items-baseline gap-2">
          <span className="font-medium tracking-tight text-[14px] text-bone-50">ContextMod</span>
          <span className="font-serif italic text-[14px] text-bone-200/70">observatory</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <span className="hidden sm:flex items-center gap-1.5">
          <span className="live-dot" aria-hidden />
          <span className="telemetry text-[11px] text-bone-200">live</span>
        </span>
        <span className="text-bone-300 text-[11px]">·</span>
        <span className="telemetry text-[11px] text-bone-200">r/{subreddit}</span>
        <span className="text-bone-300 text-[11px]">·</span>
        <time
          className={`telemetry text-[11px] text-bone-300 ${pulsing ? 'cm-refresh-pulse' : ''}`}
          dateTime={refreshedAtIso}
          title={`Last refresh: ${refreshedAtIso}`}
        >
          {ago} ago
        </time>
      </div>
    </header>
  );
}
