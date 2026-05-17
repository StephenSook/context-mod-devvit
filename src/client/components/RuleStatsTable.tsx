import { useMemo } from 'react';
import type { EventRecord } from '../lib/types';

export type RuleStat = {
  ruleKey: string; // "run/check"
  count: number;
  successCount: number;
  failedCount: number;
  dryRunCount: number;
  lastFiredTs: number;
};

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

export function RuleStatsTable({ events }: { events: EventRecord[] }) {
  const stats = useMemo(() => aggregateRuleStats(events), [events]);
  if (stats.length === 0) return null;
  return (
    <div className="cm-fade-up px-5 pt-3 pb-2" style={{ animationDelay: '0.5s' }}>
      <h2 className="text-[11px] tracking-[0.18em] uppercase text-bone-300 font-medium mb-2">
        rule <span className="font-serif italic normal-case tracking-normal text-bone-200/80">stats</span>
      </h2>
      <div className="rounded-md border border-line overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/[0.015]">
            <tr className="text-[9.5px] tracking-wider uppercase text-bone-300/80">
              <th className="text-left px-3 py-1.5 font-medium">rule</th>
              <th className="text-right px-2 py-1.5 font-medium w-[60px]">fired</th>
              <th className="text-right px-2 py-1.5 font-medium w-[50px] hidden sm:table-cell">ok</th>
              <th className="text-right px-2 py-1.5 font-medium w-[50px] hidden sm:table-cell">err</th>
              <th className="text-right px-2 py-1.5 font-medium w-[60px] hidden sm:table-cell">dry-run</th>
            </tr>
          </thead>
          <tbody>
            {stats.slice(0, 8).map((s) => (
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
