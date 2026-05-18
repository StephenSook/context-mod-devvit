import { useEffect, useState, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { StatsRow } from './components/StatsRow';
import { Sparkline } from './components/Sparkline';
import { EventRow } from './components/EventRow';
import { ActionBar } from './components/ActionBar';
import { ErrorBanner } from './components/ErrorBanner';
import { RuleCountChips } from './components/RuleCountChips';
import { EmptyState } from './components/EmptyState';
import {
  FilterChips,
  filterMatches,
  type EventFilter,
} from './components/FilterChips';
import { SkeletonRows } from './components/SkeletonRow';
import {
  EventSearchInput,
  eventMatchesQuery,
} from './components/EventSearchInput';
import { KeyboardOverlay } from './components/KeyboardOverlay';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { OnboardingTour, hasSeenTour } from './components/OnboardingTour';
import { RuleStatsTable } from './components/RuleStatsTable';
import { ConfigDiffViewer } from './components/ConfigDiffViewer';
import { ModActivityFeed } from './components/ModActivityFeed';
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
  const [filter, setFilter] = useState<EventFilter>({ kind: 'all' });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState<boolean>(() => !hasSeenTour());
  const [historyOpen, setHistoryOpen] = useState(false);
  // Y2-X56: track initial load so first paint shows shimmer skeletons
  // instead of the empty-state CTA (which would mislead the mod into
  // thinking the bot is idle when actually we just haven't fetched yet).
  const [initialLoad, setInitialLoad] = useState(true);

  const refresh = useCallback(async () => {
    const [recent, statsData] = await Promise.all([
      fetchRecentSafe(),
      fetchStatsSafe(),
    ]);

    // If EITHER call errored, surface the error and keep the last-good state
    // so the dashboard doesn't lose its display while the API recovers.
    if (!recent.ok || !statsData.ok) {
      const errMsg = !recent.ok
        ? recent.error
        : !statsData.ok
          ? statsData.error
          : 'unknown';
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
    setInitialLoad(false);
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const subreddit =
    typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('subreddit') ??
        'cm_devvit_test')
      : 'cm_devvit_test';

  const visibleEvents = useMemo(
    () =>
      events.filter(
        (e) => filterMatches(e, filter) && eventMatchesQuery(e, searchQuery)
      ),
    [events, filter, searchQuery]
  );

  const shortcuts = useMemo(
    () => [
      {
        key: '?',
        label: 'Show / hide this overlay',
        handler: () => setOverlayOpen((v) => !v),
      },
      {
        key: 'r',
        label: 'Reload data from server',
        handler: () => void refresh(),
      },
      {
        key: 'h',
        label: 'Open config history / diff viewer',
        handler: () => setHistoryOpen((v) => !v),
      },
      {
        key: 'Escape',
        label: 'Close overlay',
        handler: () => {
          setOverlayOpen(false);
          setHistoryOpen(false);
        },
      },
      {
        key: 'a',
        label: 'Show all events (clear filter)',
        handler: () => setFilter({ kind: 'all' }),
      },
    ],
    [refresh]
  );
  useKeyboardShortcuts(shortcuts);

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
              hourly{' '}
              <span className="font-serif italic normal-case tracking-normal text-bone-200/80">
                actions
              </span>{' '}
              · 24h
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
                not enough data yet — the sparkline needs at least 2 hours of
                activity
              </div>
            ))}
        </div>

        <RuleStatsTable events={events} />

        <div className="flex-1 min-h-0 mt-2 flex flex-col">
          <div className="flex items-baseline justify-between px-5 pb-2">
            <h2 className="text-[11px] tracking-[0.18em] uppercase text-bone-300 font-medium">
              recent{' '}
              <span className="font-serif italic normal-case tracking-normal text-bone-200/80">
                actions
              </span>
            </h2>
            <span className="telemetry text-[10px] text-bone-300/70">
              {visibleEvents.length}
              {visibleEvents.length !== events.length
                ? ` of ${events.length}`
                : ''}{' '}
              events
            </span>
          </div>
          <RuleCountChips events={events} />
          {events.length > 0 && (
            <FilterChips filter={filter} onChange={setFilter} />
          )}
          {events.length > 0 && (
            <EventSearchInput query={searchQuery} onChange={setSearchQuery} />
          )}

          <div
            className="flex-1 min-h-0 overflow-y-auto border-t border-line"
            aria-live="polite"
            aria-atomic="false"
            aria-relevant="additions"
            aria-label="Recent moderation actions"
          >
            {initialLoad && events.length === 0 ? (
              <SkeletonRows count={5} />
            ) : events.length === 0 ? (
              <EmptyState subreddit={subreddit} />
            ) : visibleEvents.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <p className="telemetry text-[11px] text-bone-300/80 mb-2">
                  No events match the current filter
                  {searchQuery ? ` + search "${searchQuery}"` : ''}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFilter({ kind: 'all' });
                    setSearchQuery('');
                  }}
                  className="telemetry text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border border-signal-info/60 text-signal-info hover:bg-signal-info/10 transition-colors"
                >
                  show all
                </button>
              </div>
            ) : (
              visibleEvents.map((ev, i) => (
                <EventRow
                  key={`${ev.activityId}-${ev.ts}`}
                  event={ev}
                  idx={i}
                />
              ))
            )}
          </div>
        </div>

        <ModActivityFeed refreshedAt={refreshedAt} />

        <ActionBar subreddit={subreddit} onReload={refresh} events={events} />
      </div>

      <KeyboardOverlay
        open={overlayOpen}
        onClose={() => setOverlayOpen(false)}
        shortcuts={shortcuts}
      />
      <ConfigDiffViewer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
      {tourOpen && <OnboardingTour onDone={() => setTourOpen(false)} />}
    </div>
  );
}
