import { memo, useState } from 'react';
import {
  Trash2,
  Check,
  Lock,
  MessageSquare,
  Flag,
  Ban,
  Tag,
  AlertTriangle,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import type { ActionKind, EventRecord } from '../lib/types';
import { SIGNAL } from '../lib/design-tokens';
import { chipColorForStatus, chipMarkerForStatus } from '../lib/chip';
import { EventDetails } from './EventDetails';

const KIND_ICON: Record<ActionKind, LucideIcon> = {
  remove: Trash2,
  approve: Check,
  lock: Lock,
  comment: MessageSquare,
  report: Flag,
  ban: Ban,
  userFlair: Tag,
};

// First-action icon color uses kind color for ok results; chip variant
// rendering moved to src/client/lib/chip.ts.
const KIND_COLOR: Record<ActionKind, string> = {
  remove: SIGNAL.err,
  approve: SIGNAL.ok,
  lock: SIGNAL.warn,
  comment: SIGNAL.info,
  report: SIGNAL.warn,
  ban: SIGNAL.err,
  userFlair: SIGNAL.author,
};

function relTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// X127: memoized — events are immutable RecentEvent objects; parent re-renders
// every POLL_MS (10s) but EventRow only needs to re-render when its own props
// change. Reduces 50-event dashboard re-renders from O(N) every tick to O(0).
export const EventRow = memo(
  EventRowImpl,
  (prev, next) => prev.idx === next.idx && prev.event === next.event
);

function EventRowImpl({ event, idx }: { event: EventRecord; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const allOk = event.actions.every((a) => a.ok);
  const FirstIcon = event.actions[0]
    ? (KIND_ICON[event.actions[0].kind] ?? AlertTriangle)
    : AlertTriangle;
  const firstColor = event.actions[0]
    ? (KIND_COLOR[event.actions[0].kind] ?? '#71717A')
    : '#71717A'; // bone.300 fallback
  return (
    <div
      className="cm-event-arrive border-b border-line/60"
      style={{ animationDelay: `${0.05 * idx + 0.4}s` }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Hide' : 'Show'} details for event ${event.activityId}`}
        className="group w-full grid grid-cols-[32px_48px_1fr_auto] sm:grid-cols-[44px_60px_1fr_auto] items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 hover:bg-white/[0.015] transition-colors text-left"
      >
        <div className="flex items-center gap-1.5">
          <span
            role="img"
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: allOk ? SIGNAL.ok : SIGNAL.err }}
            aria-label={allOk ? 'action succeeded' : 'action failed'}
          />
          {event.actions[0] && <FirstIcon size={13} strokeWidth={1.6} color={firstColor} />}
        </div>

        <span className="telemetry text-[11px] text-bone-300 tabular-nums">
          {relTime(event.ts)}
        </span>

        <div className="min-w-0 flex items-baseline gap-2">
          <span className="text-[12px] text-bone-50 truncate font-medium">
            {event.checkName ?? '—'}
          </span>
          <span className="telemetry text-[10.5px] text-bone-300 truncate hidden sm:inline">
            {event.activityId}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end">
          {event.actions.map((a, i) => {
            const color = chipColorForStatus(a.status, a.kind, a.ok);
            const marker = chipMarkerForStatus(a.status, a.ok);
            return (
              <span
                key={`${a.kind}-${i}`}
                className="telemetry text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
                style={{
                  color,
                  background: `${color}14`,
                  border: `1px solid ${color}33`,
                }}
                title={a.status ? `status: ${a.status}` : a.ok ? 'ok' : 'failed'}
              >
                {a.kind}
                {marker}
              </span>
            );
          })}
          <ChevronRight
            size={12}
            strokeWidth={1.8}
            className={`text-bone-300/60 transition-transform ${expanded ? 'rotate-90' : ''}`}
            aria-hidden
          />
        </div>
      </button>
      {expanded && <EventDetails event={event} />}
    </div>
  );
}
