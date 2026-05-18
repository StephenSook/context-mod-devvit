import { useMemo } from 'react';
import type { EventRecord } from '../lib/types';

const MAX_CHIPS = 5;

export function RuleCountChips({ events }: { events: EventRecord[] }) {
  const counts = useMemo(() => {
    const byRule: Record<string, number> = {};
    for (const e of events) {
      const name = e.checkName ?? 'unnamed';
      byRule[name] = (byRule[name] ?? 0) + 1;
    }
    return Object.entries(byRule).sort((a, b) => b[1] - a[1]);
  }, [events]);

  if (counts.length === 0) return null;

  const visible = counts.slice(0, MAX_CHIPS);
  const overflow = counts.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-5 pb-2">
      {visible.map(([name, n]) => (
        <span
          key={name}
          className="telemetry text-[10px] text-bone-200 bg-ink-800/70 border border-line px-1.5 py-0.5 rounded-sm tabular-nums"
          title={`${name}: ${n} ${n === 1 ? 'event' : 'events'}`}
        >
          {name}
          <span className="ml-1 text-bone-300/80">·</span>
          <span className="ml-1 text-bone-50">{n}</span>
        </span>
      ))}
      {overflow > 0 && (
        <span className="telemetry text-[10px] text-bone-300 px-1">+{overflow} more</span>
      )}
    </div>
  );
}
