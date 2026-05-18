import { AlertTriangle, X } from 'lucide-react';

/**
 * Inline error banner shown when /api/* requests fail. Distinguishes a real
 * outage from "no events yet" so operators don't mistake a backend failure for
 * a working empty state (Codex review HIGH F5).
 *
 * Dismissable so a transient failure doesn't permanently bury the dashboard.
 * Auto-clears on next successful refresh.
 */
export function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="relative flex items-center gap-2 px-5 py-2 bg-signal-err/10 border-b border-signal-err/30 text-signal-err"
    >
      <AlertTriangle size={13} strokeWidth={2} className="shrink-0" />
      <span className="flex-1 text-[11px] tracking-wide truncate">
        <span className="font-medium">Telemetry API unreachable.</span>{' '}
        <span className="telemetry text-bone-200/80">{message}</span>{' '}
        <span className="text-bone-300/70">— retrying in 10s</span>
      </span>
      <button
        onClick={onDismiss}
        className="shrink-0 p-0.5 hover:opacity-100 opacity-70 transition-opacity"
        aria-label="dismiss error"
      >
        <X size={12} strokeWidth={2} />
      </button>
    </div>
  );
}
