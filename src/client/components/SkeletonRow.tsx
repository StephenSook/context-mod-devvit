/**
 * Y2-X56: shimmer placeholder for the events stream during initial fetch.
 * Renders the same grid shape as EventRow so the layout doesn't shift when
 * real data arrives.
 */
export function SkeletonRow({ idx }: { idx: number }) {
  return (
    <div
      className="border-b border-line/40 px-3 sm:px-5 py-2.5 grid grid-cols-[32px_48px_1fr_auto] sm:grid-cols-[44px_60px_1fr_auto] items-center gap-2 sm:gap-3"
      style={{
        animation: `cm-shimmer 1.4s linear infinite`,
        animationDelay: `${idx * 0.08}s`,
        opacity: 0.4,
      }}
      aria-hidden
    >
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-bone-300/30" />
        <span className="w-3 h-3 rounded-sm bg-bone-300/20" />
      </div>
      <span className="h-3 rounded-sm bg-bone-300/20 w-8" />
      <div className="min-w-0 flex items-baseline gap-2">
        <span className="h-3 rounded-sm bg-bone-300/25 w-32" />
        <span className="h-2.5 rounded-sm bg-bone-300/15 w-16 hidden sm:inline-block" />
      </div>
      <div className="flex items-center gap-1.5 justify-end">
        <span className="h-4 rounded-sm bg-bone-300/20 w-14" />
        <span className="h-3 w-3 rounded-sm bg-bone-300/15" />
      </div>
    </div>
  );
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} idx={i} />
      ))}
    </>
  );
}
