import { motion } from 'motion/react';
import { Trash2, Check, Lock, MessageSquare, Flag, Ban, Tag, AlertTriangle } from 'lucide-react';
import type { ActionKind, EventRecord } from '../lib/types';

const KIND_ICON: Record<ActionKind, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  remove: Trash2,
  approve: Check,
  lock: Lock,
  comment: MessageSquare,
  report: Flag,
  ban: Ban,
  userFlair: Tag,
};

const KIND_COLOR: Record<ActionKind, string> = {
  remove: '#FB7185',
  approve: '#4ADE80',
  lock: '#FBBF24',
  comment: '#60A5FA',
  report: '#FBBF24',
  ban: '#FB7185',
  userFlair: '#A78BFA',
};

function relTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function EventRow({ event, idx }: { event: EventRecord; idx: number }) {
  const allOk = event.actions.every((a) => a.ok);
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.05 * idx + 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="group grid grid-cols-[44px_60px_1fr_auto] items-center gap-3 px-5 py-2.5 border-b border-line/60 hover:bg-white/[0.015] transition-colors"
    >
      {/* Status dot + first action icon */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: allOk ? '#4ADE80' : '#FB7185' }}
          aria-label={allOk ? 'ok' : 'failed'}
        />
        {event.actions[0] && (() => {
          const Icon = KIND_ICON[event.actions[0].kind] ?? AlertTriangle;
          const color = KIND_COLOR[event.actions[0].kind] ?? '#71717A';
          return <Icon size={13} strokeWidth={1.6} {...({ color } as any)} />;
        })()}
      </div>

      {/* Time */}
      <span className="telemetry text-[11px] text-bone-300 tabular-nums">{relTime(event.ts)}</span>

      {/* Rule + Activity */}
      <div className="min-w-0 flex items-baseline gap-2">
        <span className="text-[12px] text-bone-50 truncate font-medium">{event.checkName ?? '—'}</span>
        <span className="telemetry text-[10.5px] text-bone-300 truncate">{event.activityId}</span>
      </div>

      {/* Action chips */}
      <div className="flex items-center gap-1.5">
        {event.actions.map((a, i) => (
          <span
            key={i}
            className="telemetry text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
            style={{
              color: a.ok ? KIND_COLOR[a.kind] : '#FB7185',
              background: `${a.ok ? KIND_COLOR[a.kind] : '#FB7185'}14`,
              border: `1px solid ${a.ok ? KIND_COLOR[a.kind] : '#FB7185'}33`,
            }}
          >
            {a.kind}{!a.ok ? '✗' : ''}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
