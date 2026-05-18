import { memo, useMemo, useState } from 'react';
import type { EventRecord } from '../lib/types';

export type RuleStat = {
  ruleKey: string; // "run/check"
  count: number;
  successCount: number;
  failedCount: number;
  dryRunCount: number;
  lastFiredTs: number;
};

// Y2-X63: sortable columns. Default sort = count desc, recency tiebreak
// (matches previous behavior). Click a column header to flip to that sort
// key descending; click again to flip to ascending.
export type SortKey = 'count' | 'successCount' | 'failedCount' | 'dryRunCount' | 'lastFiredTs';
type SortDir = 'asc' | 'desc';

function compareStats(a: RuleStat, b: RuleStat, key: SortKey, dir: SortDir): number {
  const av = a[key];
  const bv = b[key];
  if (av === bv) return b.lastFiredTs - a.lastFiredTs;
  return dir === 'desc' ? bv - av : av - bv;
}

/**
 * Aggregate per-rule firing stats from the events:recent50 ZSET client-side.
 * No backend change — derived purely from the in-memory events array the
 * dashboard already polls. Sorts descending by count then by recency.
 */
export function aggregateRuleStats(events: EventRecord[]): RuleStat[] {
  const map = new Map<string, RuleStat>();
  for (const e of events) {
    if (!e.runName || !e.checkName) continue;
    const key = `${e.runName} / ${e.checkName}`;
    const existing = map.get(key) ?? {
      ruleKey: key,
      count: 0,
      successCount: 0,
      failedCount: 0,
      dryRunCount: 0,
      lastFiredTs: 0,
    };
    existing.count++;
    existing.lastFiredTs = Math.max(existing.lastFiredTs, e.ts);
    const anyFailed = e.actions.some((a) => !a.ok && a.status !== 'dry-run');
    const anyDryRun = e.actions.some((a) => a.status === 'dry-run');
    if (anyDryRun) existing.dryRunCount++;
    else if (anyFailed) existing.failedCount++;
    else existing.successCount++;
    map.set(key, existing);
  }
  return Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.lastFiredTs - a.lastFiredTs;
  });
}

// X127: memoized — aggregation is O(N) and re-runs on every 10s parent poll.
// useMemo inside guards the heavy work; memo() on the wrapper avoids the
// outer reconciliation when events array ref is unchanged.
export const RuleStatsTable = memo(
  RuleStatsTableImpl,
  (prev, next) => prev.events === next.events
);

function RuleStatsTableImpl({ events }: { events: EventRecord[] }) {
  const stats = useMemo(() => aggregateRuleStats(events), [events]);
  const [sortKey, setSortKey] = useState<SortKey>('count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const sortedStats = useMemo(
    () => [...stats].sort((a, b) => compareStats(a, b, sortKey, sortDir)),
    [stats, sortKey, sortDir]
  );
  function clickHeader(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  }
  function arrow(key: SortKey): string {
    if (sortKey !== key) return '';
    return sortDir === 'desc' ? ' ▼' : ' ▲';
  }
  if (stats.length === 0) return null;
  return (
    <div
      className="cm-fade-up px-5 pt-3 pb-2"
      style={{ animationDelay: '0.5s' }}
    >
      <h2 className="text-[11px] tracking-[0.18em] uppercase text-bone-300 font-medium mb-2">
        rule{' '}
        <span className="font-serif italic normal-case tracking-normal text-bone-200/80">
          stats
        </span>
      </h2>
      <div className="rounded-md border border-line overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/[0.015]">
            <tr className="text-[9.5px] tracking-wider uppercase text-bone-300/80">
              <th className="text-left px-3 py-1.5 font-medium">rule</th>
              <th
                className="text-right px-2 py-1.5 font-medium w-[60px] cursor-pointer hover:text-bone-100 transition-colors"
                onClick={() => clickHeader('count')}
                role="button"
                aria-sort={sortKey === 'count' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
              >
                fired{arrow('count')}
              </th>
              <th
                className="text-right px-2 py-1.5 font-medium w-[50px] hidden sm:table-cell cursor-pointer hover:text-bone-100 transition-colors"
                onClick={() => clickHeader('successCount')}
                role="button"
                aria-sort={sortKey === 'successCount' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
              >
                ok{arrow('successCount')}
              </th>
              <th
                className="text-right px-2 py-1.5 font-medium w-[50px] hidden sm:table-cell cursor-pointer hover:text-bone-100 transition-colors"
                onClick={() => clickHeader('failedCount')}
                role="button"
                aria-sort={sortKey === 'failedCount' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
              >
                err{arrow('failedCount')}
              </th>
              <th
                className="text-right px-2 py-1.5 font-medium w-[60px] hidden sm:table-cell cursor-pointer hover:text-bone-100 transition-colors"
                onClick={() => clickHeader('dryRunCount')}
                role="button"
                aria-sort={sortKey === 'dryRunCount' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
              >
                dry-run{arrow('dryRunCount')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStats.slice(0, 8).map((s) => (
              <tr
                key={s.ruleKey}
                className="border-t border-line/40 hover:bg-white/[0.015] transition-colors"
              >
                <td className="text-left px-3 py-1.5 text-[11px] text-bone-100 truncate">
                  {s.ruleKey}
                </td>
                <td className="text-right px-2 py-1.5 telemetry text-[11px] text-bone-50 tabular-nums">
                  {s.count}
                </td>
                <td className="text-right px-2 py-1.5 telemetry text-[10.5px] text-signal-ok tabular-nums hidden sm:table-cell">
                  {s.successCount}
                </td>
                <td className="text-right px-2 py-1.5 telemetry text-[10.5px] text-signal-err tabular-nums hidden sm:table-cell">
                  {s.failedCount}
                </td>
                <td className="text-right px-2 py-1.5 telemetry text-[10.5px] text-signal-info tabular-nums hidden sm:table-cell">
                  {s.dryRunCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
