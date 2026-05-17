import type { EventRecord, ActionKind } from '../lib/types';

export type EventFilter =
  | { kind: 'all' }
  | { kind: 'action'; action: ActionKind }
  | { kind: 'failed' }
  | { kind: 'dry-run' };

export function filterMatches(event: EventRecord, filter: EventFilter): boolean {
  if (filter.kind === 'all') return true;
  if (filter.kind === 'failed') return event.actions.some((a) => !a.ok);
  if (filter.kind === 'dry-run') return event.actions.some((a) => a.status === 'dry-run');
  return event.actions.some((a) => a.kind === filter.action);
}

function isActive(filter: EventFilter, candidate: EventFilter): boolean {
  if (filter.kind !== candidate.kind) return false;
  if (filter.kind === 'action' && candidate.kind === 'action') {
    return filter.action === candidate.action;
  }
  return true;
}

const CHIPS: { label: string; filter: EventFilter }[] = [
  { label: 'all', filter: { kind: 'all' } },
  { label: 'remove', filter: { kind: 'action', action: 'remove' } },
  { label: 'comment', filter: { kind: 'action', action: 'comment' } },
  { label: 'approve', filter: { kind: 'action', action: 'approve' } },
  { label: 'lock', filter: { kind: 'action', action: 'lock' } },
  { label: 'report', filter: { kind: 'action', action: 'report' } },
  { label: 'failed', filter: { kind: 'failed' } },
  { label: 'dry-run', filter: { kind: 'dry-run' } },
];

export function FilterChips({
  filter,
  onChange,
}: {
  filter: EventFilter;
  onChange: (filter: EventFilter) => void;
}) {
  return (
    <div
      className="cm-fade-up flex flex-wrap items-center gap-1.5 px-5 pb-2"
      role="group"
      aria-label="Filter event stream by action kind or status"
      style={{ animationDelay: '0.45s' }}
    >
      <span className="telemetry text-[10px] text-bone-300/70 mr-1 uppercase tracking-wider">
        filter
      </span>
      {CHIPS.map((chip) => {
        const active = isActive(filter, chip.filter);
        return (
          <button
            key={chip.label}
            type="button"
            onClick={() => onChange(chip.filter)}
            aria-pressed={active}
            className={`telemetry text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border transition-colors ${
              active
                ? 'border-signal-ok/60 text-signal-ok bg-signal-ok/10'
                : 'border-line text-bone-300 hover:text-bone-50 hover:border-bone-200/40'
            }`}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
