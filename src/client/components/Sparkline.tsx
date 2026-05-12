export function Sparkline({ data, height = 36, width = 280 }: { data?: number[]; height?: number; width?: number }) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  // Use reduce instead of Math.max(...data) — spread on large arrays can
  // hit "Maximum call stack size exceeded" (per Codex review HIGH).
  const max = data.reduce((m, v) => (Number.isFinite(v) && v > m ? v : m), 1);
  const step = width / (data.length - 1 || 1);
  const points = data.map((v, i) => `${i * step},${height - (v / max) * (height - 4) - 2}`);
  const path = `M ${points[0]} L ${points.slice(1).join(' L ')}`;
  const area = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;

  // Rough path length for the CSS dasharray draw animation
  const lineLen = Math.round(width * 1.4);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className="overflow-visible cm-fade-in"
      style={{ animationDelay: '0.55s' }}
      aria-label="hourly action volume, last 24h"
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#4ADE80" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path
        d={path}
        fill="none"
        stroke="#4ADE80"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="cm-draw"
        style={{ ['--line-len' as any]: lineLen }}
      />
    </svg>
  );
}
