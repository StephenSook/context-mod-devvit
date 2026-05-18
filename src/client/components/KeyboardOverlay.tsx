import type { KeyboardShortcut } from '../hooks/useKeyboardShortcuts';

export function KeyboardOverlay({
  open,
  onClose,
  shortcuts,
}: {
  open: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cm-shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="cm-fade-up max-w-sm w-[92%] rounded-xl glass p-5 border border-line"
      >
        <div className="flex items-baseline justify-between mb-3">
          <h2
            id="cm-shortcuts-title"
            className="text-[13px] tracking-tight text-bone-50 font-medium"
          >
            Keyboard <span className="font-serif italic text-bone-200/70">shortcuts</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="telemetry text-[10px] uppercase tracking-wider text-bone-300 hover:text-bone-50 transition-colors"
          >
            close · esc
          </button>
        </div>

        <ul className="space-y-1.5">
          {shortcuts.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-3">
              <span className="text-[11.5px] text-bone-100">{s.label}</span>
              <kbd className="telemetry text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm border border-line text-bone-200 bg-white/[0.02] min-w-[28px] text-center">
                {s.key === '?' ? '?' : s.key.toUpperCase()}
              </kbd>
            </li>
          ))}
        </ul>

        <p className="telemetry text-[10px] text-bone-300/60 mt-3 leading-relaxed">
          Shortcuts ignored when typing in inputs / textareas. Click outside or press escape to
          dismiss.
        </p>
      </div>
    </div>
  );
}
