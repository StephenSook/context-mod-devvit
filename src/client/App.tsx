import { useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header';
import { StatsRow } from './components/StatsRow';
import { Sparkline } from './components/Sparkline';
import { EventRow } from './components/EventRow';
import { ActionBar } from './components/ActionBar';
import { fetchRecent, fetchStats, DEMO_EVENTS, DEMO_STATS } from './lib/api';
import type { EventRecord, StatsRollup } from './lib/types';

const POLL_MS = 10_000;

export default function App() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [stats, setStats] = useState<StatsRollup | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<number>(Date.now());
  const [usingDemo, setUsingDemo] = useState(false);

  const refresh = useCallback(async () => {
    const [recent, statsData] = await Promise.all([fetchRecent(), fetchStats()]);
    if (recent.length === 0 && !statsData) {
      setEvents(DEMO_EVENTS);
      setStats(DEMO_STATS);
      setUsingDemo(true);
    } else {
      setEvents(recent);
      setStats(statsData ?? DEMO_STATS);
      setUsingDemo(false);
    }
    setRefreshedAt(Date.now());
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
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
          {stats && <Sparkline data={stats.hourlyActions24h} />}
        </div>

        <div className="flex-1 min-h-0 mt-2 flex flex-col">
          <div className="flex items-baseline justify-between px-5 pb-2">
            <h2 className="text-[11px] tracking-[0.18em] uppercase text-bone-300 font-medium">
              recent <span className="font-serif italic normal-case tracking-normal text-bone-200/80">actions</span>
            </h2>
            <span className="telemetry text-[10px] text-bone-300/70">{events.length} events</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto border-t border-line">
            {events.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-bone-300 text-[12px] font-serif italic">
                  No actions yet — make sure your config is loaded.
                </p>
              </div>
            ) : (
              events.map((ev, i) => <EventRow key={`${ev.activityId}-${ev.ts}`} event={ev} idx={i} />)
            )}
          </div>
        </div>

        <ActionBar onReload={refresh} />
      </div>
    </div>
  );
}
