import { useState } from 'react';
import { SIGNAL } from '../lib/design-tokens';

export function Sparkline({ data, height = 36, width = 280 }: { data?: number[]; height?: number; width?: number }) {
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  // Use reduce instead of Math.max(...data) — spread on large arrays can
  // hit "Maximum call stack size exceeded" (per Codex review HIGH).
  const max = data.reduce((m, v) => (Number.isFinite(v) && v > m ? v : m), 1);
  const step = width / (data.length - 1 || 1);
  const coords = data.map((v, i) => ({ x: i * step, y: height - (v / max) * (height - 4) - 2 }));
  const points = coords.map((c) => `${c.x},${c.y}`);
  const path = `M ${points[0]} L ${points.slice(1).join(' L ')}`;
  const area = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;

  // Rough path length for the CSS dasharray draw animation
  const lineLen = Math.round(width * 1.4);

  // Map SVG x to nearest bucket index for hover tooltip.
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * width;
    const idx = Math.min(data.length - 1, Math.max(0, Math.round(svgX / step)));
    const c = coords[idx];
    if (!c) return;
    setHover({ idx, x: c.x, y: c.y });
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        className="overflow-visible cm-fade-in"
        style={{ animationDelay: '0.55s' }}
        aria-label="hourly action volume, last 24h"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={SIGNAL.ok} stopOpacity="0.18" />
            <stop offset="100%" stopColor={SIGNAL.ok} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#spark-fill)" />
        <path
          d={path}
          fill="none"
          stroke={SIGNAL.ok}
          strokeWidth="1.25"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="cm-draw"
          style={{ '--line-len': lineLen } as React.CSSProperties}
        />
        {hover && (
          <>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={0}
              y2={height}
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="0.5"
            />
            <circle cx={hover.x} cy={hover.y} r={2.5} fill={SIGNAL.ok} />
          </>
        )}
      </svg>
      {hover && (
        <div
          className="absolute pointer-events-none telemetry text-[10px] text-bone-50 bg-ink-900/90 border border-line px-1.5 py-0.5 rounded-sm tabular-nums"
          style={{
            left: `${(hover.x / width) * 100}%`,
            top: '-22px',
            transform: 'translateX(-50%)',
          }}
        >
          {hover.idx}:00 · {data[hover.idx]}
        </div>
      )}
    </div>
  );
}
