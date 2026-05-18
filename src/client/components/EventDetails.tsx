import { useState } from 'react';
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
              <dt className="telemetry text-bone-300/70 uppercase tracking-wider text-[9.5px]">
                run
              </dt>
              <dd className="text-bone-100">{event.runName}</dd>
            </>
          )}
          {event.checkName && (
            <>
              <dt className="telemetry text-bone-300/70 uppercase tracking-wider text-[9.5px]">
                check
              </dt>
              <dd className="text-bone-100">{event.checkName}</dd>
            </>
          )}
          {event.matchedRule && (
            <>
              <dt className="telemetry text-bone-300/70 uppercase tracking-wider text-[9.5px]">
                rule
              </dt>
              <dd className="text-bone-100">{event.matchedRule}</dd>
            </>
          )}
          {event.runPath && (
            <>
              <dt className="telemetry text-bone-300/70 uppercase tracking-wider text-[9.5px]">
                path
              </dt>
              <dd className="telemetry text-bone-100 text-[10px]">{event.runPath}</dd>
            </>
          )}
          {event.matchedSubstring && (
            <>
              <dt className="telemetry text-bone-300/70 uppercase tracking-wider text-[9.5px]">
                matched
              </dt>
              <dd className="telemetry text-signal-ok text-[10px] break-all">
                "{event.matchedSubstring}"
              </dd>
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

      <AiExplainButton event={event} />

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

/**
 * Wave V Phase V7 — "Explain with AI" button on each event drill-down.
 * POSTs to /api/explain-event w/ event summary, renders OpenAI explanation
 * inline. Mod-auth gated server-side (no client UI for non-mods).
 */
function AiExplainButton({ event }: { event: EventRecord }) {
  const [state, setState] = useState<{
    loading: boolean;
    explanation?: string;
    error?: string;
  }>({
    loading: false,
  });

  async function handleClick() {
    if (state.loading) return;
    setState({ loading: true });
    try {
      const eventSummary = {
        runName: event.runName,
        checkName: event.checkName,
        matchedRule: event.matchedRule,
        matchedSubstring: event.matchedSubstring,
        actions: event.actions.map((a) => ({
          kind: String(a.kind),
          ok: a.ok,
          ...(a.status ? { status: a.status } : {}),
        })),
      };
      const res = await fetch('/api/explain-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: eventSummary }),
      });
      const data = await res.json();
      if (data.ok) {
        setState({ loading: false, explanation: data.explanation });
      } else {
        setState({ loading: false, error: data.error ?? `HTTP ${res.status}` });
      }
    } catch (err) {
      setState({
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={state.loading}
        className="telemetry text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border border-signal-info/60 text-signal-info hover:bg-signal-info/10 transition-colors disabled:opacity-50 disabled:cursor-wait"
      >
        {state.loading ? 'thinking…' : '✨ Explain with AI'}
      </button>
      {state.explanation && (
        <p className="cm-fade-in mt-2 text-[11px] text-bone-100 leading-relaxed p-2 rounded-sm bg-signal-info/5 border border-signal-info/30">
          {state.explanation}
        </p>
      )}
      {state.error && (
        <p className="cm-fade-in mt-2 text-[10px] text-signal-err/90 p-2 rounded-sm bg-signal-err/5 border border-signal-err/30">
          {state.error}
        </p>
      )}
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
