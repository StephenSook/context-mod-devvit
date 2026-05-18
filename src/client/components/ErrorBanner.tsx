import { AlertTriangle, X } from 'lucide-react';

/**
 * Inline error banner shown when /api/* requests fail. Distinguishes a real
 * outage from "no events yet" so operators don't mistake a backend failure for
 * a working empty state.
 *
 * Z2-X57: supports a stack of errors. Pass a single string OR an array.
 * Each renders as its own dismissable banner. Caller dedups upstream.
 */
export function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string | string[];
  onDismiss: () => void;
}) {
  const messages = Array.isArray(message) ? message : [message];
  if (messages.length === 0) return null;
  return (
    <div role="alert">
      {messages.map((m, i) => (
        <div
          key={`${m}-${i}`}
          className="relative flex items-center gap-2 px-5 py-2 bg-signal-err/10 border-b border-signal-err/30 text-signal-err"
        >
          <AlertTriangle size={13} strokeWidth={2} className="shrink-0" />
          <span className="flex-1 text-[11px] tracking-wide truncate">
            <span className="font-medium">Telemetry API unreachable.</span>{' '}
            <span className="telemetry text-bone-200/80">{m}</span>{' '}
            <span className="text-bone-300/70">— retrying in 10s</span>
          </span>
          {i === messages.length - 1 && (
            <button
              onClick={onDismiss}
              className="shrink-0 p-0.5 hover:opacity-100 opacity-70 transition-opacity"
              aria-label="dismiss errors"
            >
              <X size={12} strokeWidth={2} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
