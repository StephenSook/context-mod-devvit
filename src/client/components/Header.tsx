import { motion } from 'motion/react';

export function Header({ subreddit, refreshedAt }: { subreddit: string; refreshedAt: number }) {
  const ago = Math.max(1, Math.round((Date.now() - refreshedAt) / 1000));
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative px-5 py-3.5 flex items-center justify-between border-b border-line"
    >
      <div className="flex items-center gap-3">
        {/* Brand mark — concentric rings, mod observatory motif */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke="rgba(245,245,244,0.4)" strokeWidth="1" />
          <circle cx="12" cy="12" r="6" stroke="rgba(245,245,244,0.7)" strokeWidth="1" />
          <circle cx="12" cy="12" r="2" fill="#4ADE80" />
        </svg>
        <div className="flex items-baseline gap-2">
          <span className="font-medium tracking-tight text-[14px] text-bone-50">ContextMod</span>
          <span className="font-serif italic text-[14px] text-bone-200/70">observatory</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:flex items-center gap-1.5">
          <span className="live-dot" aria-hidden />
          <span className="telemetry text-[11px] text-bone-200">live</span>
        </span>
        <span className="text-bone-300 text-[11px]">·</span>
        <span className="telemetry text-[11px] text-bone-200">r/{subreddit}</span>
        <span className="text-bone-300 text-[11px]">·</span>
        <span className="telemetry text-[11px] text-bone-300">{ago}s ago</span>
      </div>
    </motion.header>
  );
}
