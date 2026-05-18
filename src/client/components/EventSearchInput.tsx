/**
 * Y2-X62: text-search filter on the events stream. Case-insensitive
 * substring match against activityId + runName + checkName + action.kind.
 * Combines w/ the FilterChips kind filter (both must match).
 */
export function EventSearchInput({
  query,
  onChange,
}: {
  query: string;
  onChange: (q: string) => void;
}) {
  return (
    <div className="px-3 sm:px-5 pb-1.5">
      <label className="sr-only" htmlFor="cm-event-search">
        Search events
      </label>
      <input
        id="cm-event-search"
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="search events…  (activityId · run · check · action)"
        className="telemetry w-full text-[10.5px] px-2 py-1 rounded-sm bg-ink-900/40 border border-line/50 text-bone-100 placeholder:text-bone-300/40 focus:outline-none focus:border-signal-info/60 transition-colors"
      />
    </div>
  );
}

export function eventMatchesQuery(
  event: {
    activityId: string;
    runName?: string;
    checkName?: string;
    actions: { kind: string }[];
  },
  query: string
): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  if (event.activityId.toLowerCase().includes(q)) return true;
  if (event.runName?.toLowerCase().includes(q)) return true;
  if (event.checkName?.toLowerCase().includes(q)) return true;
  for (const a of event.actions) {
    if (a.kind.toLowerCase().includes(q)) return true;
  }
  return false;
}
