import { motion } from 'motion/react';
import type { StatsRollup } from '../lib/types';

function Card({ label, value, accent, delay }: { label: string; value: string; accent?: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-xl glass p-3.5 flex flex-col gap-1.5 min-w-0"
    >
      <span className="text-[10px] tracking-[0.18em] uppercase text-bone-300 font-medium">{label}</span>
      <span
        className="telemetry text-[28px] leading-none truncate"
        style={{ color: accent ?? '#F5F5F4' }}
        title={value}
      >
        {value}
      </span>
    </motion.div>
  );
}

export function StatsRow({ stats }: { stats: StatsRollup }) {
  const hours = Math.floor(stats.timeSavedMin / 60);
  const mins = stats.timeSavedMin % 60;
  const timeFmt = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 px-5 pt-4">
      <Card label="Actions today" value={String(stats.actionsToday)} accent="#F5F5F4" delay={0.05} />
      <Card label="Mod time saved" value={timeFmt} accent="#4ADE80" delay={0.12} />
      <Card label="Active rules" value={String(stats.activeRules)} accent="#F5F5F4" delay={0.19} />
      <Card label="Top rule" value={stats.topRule} accent="#FBBF24" delay={0.26} />
    </div>
  );
}
