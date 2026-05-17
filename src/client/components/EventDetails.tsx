import type { EventRecord } from '../lib/types';
import { actionMarker } from '../lib/csv-export';

/**
 * Expanded drill-down panel for an EventRow (S2 Wave).
 * Shows: rule context (run/check/rule names), per-action status + wouldHaveCalled,
 * matched substring (regex rules), raw event JSON in collapsible.
 */
export function EventDetails({ event }: { event: EventRecord }) {
  return (
    <div className="cm-fade-in border-t border-line/40 bg-white/[0.01] px-3 sm:px-5 py-3 space-y-2.5">
      <DetailSection label="Rule context">
        <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1 text-[11px]">
          {event.runName && (
            <>
              <dt className="telemetry text-bone-300/70 uppercase tracking-wider text-[9.5px]">run</dt>
              <dd className="text-bone-100">{event.runName}</dd>
            </>
          )}
          {event.checkName && (
            <>
              <dt className="telemetry text-bone-300/70 uppercase tracking-wider text-[9.5px]">check</dt>
              <dd className="text-bone-100">{event.checkName}</dd>
            </>
          )}
          {event.matchedRule && (
            <>
              <dt className="telemetry text-bone-300/70 uppercase tracking-wider text-[9.5px]">rule</dt>
              <dd className="text-bone-100">{event.matchedRule}</dd>
            </>
          )}
          {event.runPath && (
            <>
              <dt className="telemetry text-bone-300/70 uppercase tracking-wider text-[9.5px]">path</dt>
              <dd className="telemetry text-bone-100 text-[10px]">{event.runPath}</dd>
            </>
          )}
          {event.matchedSubstring && (
            <>
              <dt className="telemetry text-bone-300/70 uppercase tracking-wider text-[9.5px]">matched</dt>
              <dd className="telemetry text-signal-ok text-[10px] break-all">"{event.matchedSubstring}"</dd>
            </>
          )}
        </dl>
      </DetailSection>

      <DetailSection label={`Actions (${event.actions.length})`}>
        <ul className="space-y-1">
          {event.actions.map((a, i) => {
            const marker = actionMarker(a.status, a.ok);
            return (
              <li key={`${a.kind}-${i}`} className="flex items-baseline gap-2 text-[11px]">
                <span className="telemetry text-bone-200 min-w-[64px]">
                  {a.kind}
                  {marker}
                </span>
                {a.status && (
                  <span className="telemetry text-[10px] text-bone-300/80">{a.status}</span>
                )}
                {a.wouldHaveCalled && (
                  <span className="telemetry text-[10px] text-signal-info/80 break-all">
                    → {a.wouldHaveCalled}
                  </span>
                )}
                {a.error && (
                  <span className="telemetry text-[10px] text-signal-err/80 break-all">
                    err: {a.error}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </DetailSection>

      <details className="text-[10px]">
        <summary className="telemetry text-bone-300/70 uppercase tracking-wider cursor-pointer hover:text-bone-200 transition-colors">
          raw event JSON
        </summary>
        <pre className="telemetry mt-2 p-2 rounded-sm bg-ink-950 border border-line/60 text-bone-200 overflow-x-auto max-h-48 text-[10px] leading-relaxed">
          {JSON.stringify(event, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="telemetry text-[9.5px] uppercase tracking-wider text-bone-300/70 mb-1.5">
        {label}
      </h3>
      {children}
    </div>
  );
}
