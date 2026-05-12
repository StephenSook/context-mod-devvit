import { motion } from 'motion/react';

export function Sparkline({ data, height = 36, width = 280 }: { data: number[]; height?: number; width?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const step = width / (data.length - 1 || 1);
  const points = data.map((v, i) => `${i * step},${height - (v / max) * (height - 4) - 2}`);
  const path = `M ${points[0]} L ${points.slice(1).join(' L ')}`;
  const area = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;

  return (
    <motion.svg
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.55 }}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className="overflow-visible"
      aria-label="hourly action volume, last 24h"
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#4ADE80" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <motion.path
        d={path}
        fill="none"
        stroke="#4ADE80"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.svg>
  );
}
