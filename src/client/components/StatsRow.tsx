import type { StatsRollup } from '../lib/types';

// Accent token names map to tailwind.config.ts signal palette + bone primary.
type AccentToken = 'bone' | 'ok' | 'warn' | 'err' | 'info' | 'author';

const ACCENT_CLASS: Record<AccentToken, string> = {
  bone: 'text-bone-50',
  ok: 'text-signal-ok',
  warn: 'text-signal-warn',
  err: 'text-signal-err',
  info: 'text-signal-info',
  author: 'text-signal-author',
};

function Card({
  label,
  value,
  accent = 'bone',
  delay,
  live,
}: {
  label: string;
  value: string;
  accent?: AccentToken;
  delay: number;
  live?: boolean;
}) {
  return (
    <div
      className="cm-fade-up relative rounded-xl glass p-3.5 flex flex-col gap-1.5 min-w-0"
      style={{ animationDelay: `${delay}s` }}
    >
      <span className="text-[10px] tracking-[0.18em] uppercase text-bone-300 font-medium flex items-center gap-1.5">
        {label}
        {live && (
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-signal-ok animate-pulse-dot"
            aria-hidden
          />
        )}
      </span>
      <span
        className={`telemetry text-[28px] leading-none truncate ${ACCENT_CLASS[accent]}`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

export function StatsRow({ stats }: { stats: StatsRollup }) {
  const hours = Math.floor(stats.timeSavedMin / 60);
  const mins = stats.timeSavedMin % 60;
  const timeFmt = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 px-5 pt-4">
      <Card label="Actions today" value={String(stats.actionsToday)} accent="bone" delay={0.05} />
      {/* AE Polish #46: "(est.)" qualifier — silent-failure-hunter Finding
          3 flagged that timeSavedMin reads as a measurement but is actually
          a heuristic (`today * 4` per-action minutes). Without the qualifier,
          mods would see "you saved 240 min today" + treat it as a measured
          quantity. Compact label fits stat card on mobile. */}
      <Card label="Mod time saved (est.)" value={timeFmt} accent="ok" delay={0.12} />
      <Card
        label="Active rules"
        value={String(stats.activeRules)}
        accent="bone"
        delay={0.19}
        live={stats.activeRules > 0}
      />
      <Card label="Top rule" value={stats.topRule} accent="warn" delay={0.26} />
    </div>
  );
}
