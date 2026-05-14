import { useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header';
import { StatsRow } from './components/StatsRow';
import { Sparkline } from './components/Sparkline';
import { EventRow } from './components/EventRow';
import { ActionBar } from './components/ActionBar';
import { ErrorBanner } from './components/ErrorBanner';
import { RuleCountChips } from './components/RuleCountChips';
import {
  fetchRecentSafe,
  fetchStatsSafe,
  DEMO_EVENTS,
  DEMO_STATS,
  ZERO_STATS,
} from './lib/api';
import type { EventRecord, StatsRollup } from './lib/types';

const POLL_MS = 10_000;

// Demo data is OPT-IN only via ?demo=1 — production never shows fabricated mod
// actions (per Codex review M6: invented data risks Devvit app review rejection).
const DEMO_ENABLED =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('demo') === '1';

export default function App() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [stats, setStats] = useState<StatsRollup | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<number>(Date.now());
  const [usingDemo, setUsingDemo] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [recent, statsData] = await Promise.all([fetchRecentSafe(), fetchStatsSafe()]);

    // If EITHER call errored, surface the error and keep the last-good state
    // so the dashboard doesn't lose its display while the API recovers.
    if (!recent.ok || !statsData.ok) {
      const errMsg = !recent.ok ? recent.error : !statsData.ok ? statsData.error : 'unknown';
      setApiError(errMsg);
      setRefreshedAt(Date.now());
      return;
    }

    setApiError(null);

    // Both calls succeeded. Three branches: real data, empty + demo, empty + zero-state.
    const recentEvents = recent.empty ? [] : recent.data;
    const statsValue = statsData.empty ? null : statsData.data;

    if (recentEvents.length === 0 && !statsValue) {
      if (DEMO_ENABLED) {
        setEvents(DEMO_EVENTS);
        setStats(DEMO_STATS);
        setUsingDemo(true);
      } else {
        setEvents([]);
        setStats(ZERO_STATS);
        setUsingDemo(false);
      }
    } else {
      setEvents(recentEvents);
      setStats(statsValue ?? ZERO_STATS);
      setUsingDemo(false);
    }
    setRefreshedAt(Date.now());
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const subreddit =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('subreddit') ?? 'cm_devvit_test'
      : 'cm_devvit_test';

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col bg-ink-950 grain">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(80% 60% at 50% 0%, rgba(74,222,128,0.06), transparent 60%), radial-gradient(40% 40% at 90% 100%, rgba(96,165,250,0.05), transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col h-full">
        <Header subreddit={subreddit} refreshedAt={refreshedAt} />

        {apiError && (
          <ErrorBanner message={apiError} onDismiss={() => setApiError(null)} />
        )}

        {stats && <StatsRow stats={stats} />}

        <div
          className="cm-fade-up px-5 pt-3.5 pb-1"
          style={{ animationDelay: '0.35s' }}
        >
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="text-[11px] tracking-[0.18em] uppercase text-bone-300 font-medium">
              hourly <span className="font-serif italic normal-case tracking-normal text-bone-200/80">actions</span> · 24h
            </h2>
            {usingDemo && (
              <span className="telemetry text-[9px] tracking-wider uppercase text-bone-300/80">
                demo · awaiting real events
              </span>
            )}
          </div>
          {stats &&
            (stats.hourlyActions24h.length >= 2 ? (
              <Sparkline data={stats.hourlyActions24h} />
            ) : (
              <div className="telemetry text-[10px] text-bone-300/60 px-5 pb-2">
                not enough data yet — the sparkline needs at least 2 hours of activity
              </div>
            ))}
        </div>

        <div className="flex-1 min-h-0 mt-2 flex flex-col">
          <div className="flex items-baseline justify-between px-5 pb-2">
            <h2 className="text-[11px] tracking-[0.18em] uppercase text-bone-300 font-medium">
              recent <span className="font-serif italic normal-case tracking-normal text-bone-200/80">actions</span>
            </h2>
            <span className="telemetry text-[10px] text-bone-300/70">{events.length} events</span>
          </div>
          <RuleCountChips events={events} />

          <div className="flex-1 min-h-0 overflow-y-auto border-t border-line">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-2">
                <p className="text-bone-200 text-[13px]">Nothing has fired yet.</p>
                <p className="text-bone-300/80 text-[11px] font-serif italic leading-relaxed max-w-xs">
                  Define rules in{' '}
                  <span className="not-italic font-sans text-bone-200">
                    r/{subreddit}/wiki/contextmod
                  </span>{' '}
                  to start moderating.
                </p>
                <p className="text-bone-300/50 text-[10px] tracking-wide uppercase mt-1">
                  events refresh every 10s
                </p>
              </div>
            ) : (
              events.map((ev, i) => <EventRow key={`${ev.activityId}-${ev.ts}`} event={ev} idx={i} />)
            )}
          </div>
        </div>

        <ActionBar subreddit={subreddit} onReload={refresh} events={events} />
      </div>
    </div>
  );
}
