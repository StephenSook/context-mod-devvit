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
 * AE Polish #4 — friendly error mapping for common /api/explain-event failures.
 * Raw server messages ("Unauthorized: mod auth required for /api/explain-event")
 * are too dev-flavored for moderator UX. Map known patterns to plain English;
 * fall back to a short truncation of the raw message for anything else.
 */
export function friendlyExplainError(raw: string): string {
  const lower = raw.toLowerCase();
  // Polish #18: 503 transient mod-check failure — check BEFORE the
  // mod-auth branch (otherwise "mod check" would not match 'mod auth'
  // and we'd fall through to raw, but be explicit + future-proof).
  if (lower.includes('mod check transient') || lower.includes('transient failure')) {
    return "Reddit's mod API is briefly unavailable. Try again in ~30s.";
  }
  if (lower.includes('mod auth') || lower.includes('moderator') || lower.includes('401') || lower.includes('403')) {
    return 'Sign in as a moderator of this sub to use AI explanations.';
  }
  if (lower.includes('rate limit') || lower.includes('429')) {
    return raw; // already mod-friendly per api.ts
  }
  if (lower.includes('breaker') || lower.includes('temporarily unavailable')) {
    return 'AI service is temporarily unavailable. Try again in a minute.';
  }
  // Polish #20: Redis/subsystem-degraded check BEFORE api-key check.
  // The api-key resolve failure path returns "Could not read OpenAI API key
  // (Redis/settings unavailable). Retry in ~60s." which contains both
  // 'api key' AND 'redis' substrings. The root cause is Redis, not a
  // missing key — directing the mod to "Set OpenAI API key" sends them
  // to a form that will also fail (same Redis-down condition) + makes
  // them think their key is gone when it's actually fine.
  if (lower.includes('redis') || lower.includes('subsystem degraded')) {
    return 'Backend storage is degraded. Try again in ~60s.';
  }
  if (lower.includes('api key') || lower.includes('missing')) {
    return 'OpenAI API key is not configured. Use the "ContextMod: Set OpenAI API key" mod menu to add one.';
  }
  if (lower.includes('timed out') || lower.includes('timeout')) {
    return 'AI request timed out (~30s). Try again — usually a transient OpenAI hiccup.';
  }
  // Truncate the raw to keep it readable.
  return raw.length > 160 ? raw.slice(0, 160) + '…' : raw;
}

/**
 * Wave V Phase V7 — "Explain with AI" button on each event drill-down.
 * POSTs to /api/explain-event w/ event summary, renders OpenAI explanation
 * inline. Mod-auth gated server-side (no client UI for non-mods).
 *
 * AE Polish #4: loading state shows an animated 3-dot pulse + skeleton
 * for where the explanation will land (no more static "thinking…" label
 * for the 2-8s OpenAI wait). Error path runs through friendlyExplainError
 * so judges hitting a known-class failure (auth, rate-limit, breaker,
 * key-missing, Redis-degraded, timeout) get an actionable message instead
 * of a raw stack-fragment.
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
        aria-busy={state.loading}
        className="telemetry text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border border-signal-info/60 text-signal-info hover:bg-signal-info/10 transition-colors disabled:opacity-50 disabled:cursor-wait inline-flex items-center gap-1.5"
      >
        {state.loading ? (
          <>
            <span aria-hidden="true" className="inline-flex gap-0.5">
              <span className="cm-ai-pulse-dot" style={{ animationDelay: '0s' }}>·</span>
              <span className="cm-ai-pulse-dot" style={{ animationDelay: '0.2s' }}>·</span>
              <span className="cm-ai-pulse-dot" style={{ animationDelay: '0.4s' }}>·</span>
            </span>
            <span>thinking</span>
          </>
        ) : (
          <>
            <span aria-hidden="true">✨</span>
            <span>Explain with AI</span>
          </>
        )}
      </button>
      {state.loading && (
        <div
          className="cm-fade-in mt-2 p-2 rounded-sm bg-signal-info/5 border border-signal-info/20 space-y-1.5"
          role="status"
          aria-live="polite"
          aria-label="AI explanation loading"
        >
          <div className="h-2 rounded bg-signal-info/15 animate-pulse w-full" />
          <div className="h-2 rounded bg-signal-info/15 animate-pulse w-5/6" />
          <div className="h-2 rounded bg-signal-info/15 animate-pulse w-3/5" />
        </div>
      )}
      {state.explanation && (
        <p
          className="cm-fade-in mt-2 text-[11px] text-bone-100 leading-relaxed p-2 rounded-sm bg-signal-info/5 border border-signal-info/30"
          aria-live="polite"
        >
          {state.explanation}
        </p>
      )}
      {state.error && (
        <p
          className="cm-fade-in mt-2 text-[10px] text-signal-err/90 p-2 rounded-sm bg-signal-err/5 border border-signal-err/30"
          role="alert"
        >
          {friendlyExplainError(state.error)}
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
