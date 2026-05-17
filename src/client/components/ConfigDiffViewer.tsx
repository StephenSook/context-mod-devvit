import { useEffect, useState } from 'react';
import type { ApiResult } from '../lib/types';

export type ConfigRev = { rev: number; config: unknown };

async function fetchConfigHistory(): Promise<ApiResult<ConfigRev[]>> {
  try {
    const demo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1';
    const res = await fetch(`/api/config-history${demo ? '?demo=1' : ''}`);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    const revs = Array.isArray(data?.revs) ? (data.revs as ConfigRev[]) : [];
    if (revs.length === 0) return { ok: true, empty: true };
    return { ok: true, empty: false, data: revs };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function simpleDiff(a: string, b: string): { line: string; tag: 'add' | 'del' | 'same' }[] {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const aSet = new Set(aLines);
  const bSet = new Set(bLines);
  const lines: { line: string; tag: 'add' | 'del' | 'same' }[] = [];
  for (const line of aLines) {
    if (bSet.has(line)) lines.push({ line, tag: 'same' });
    else lines.push({ line, tag: 'del' });
  }
  for (const line of bLines) {
    if (!aSet.has(line)) lines.push({ line, tag: 'add' });
  }
  return lines;
}

export function ConfigDiffViewer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, setState] = useState<ApiResult<ConfigRev[]>>({ ok: true, empty: true });
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    void fetchConfigHistory().then(setState);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cm-diff-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="cm-fade-up max-w-4xl w-full max-h-[85vh] flex flex-col rounded-xl glass border border-line"
      >
        <header className="flex items-baseline justify-between px-5 py-3 border-b border-line">
          <h2 id="cm-diff-title" className="text-[13px] tracking-tight text-bone-50 font-medium">
            Config <span className="font-serif italic text-bone-200/70">history</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="telemetry text-[10px] uppercase tracking-wider text-bone-300 hover:text-bone-50 transition-colors"
          >
            close · esc
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4">
          {!state.ok ? (
            <p className="text-[12px] text-signal-err">Error: {state.error}</p>
          ) : state.empty ? (
            <p className="text-[12px] text-bone-300/80">
              No config history yet. After your first wiki edit + reload, revisions show up here.
            </p>
          ) : (
            <div className="grid grid-cols-[140px_1fr] gap-4">
              <ul className="space-y-1">
                {state.data.map((r, i) => (
                  <li key={r.rev}>
                    <button
                      type="button"
                      onClick={() => setSelectedIdx(i)}
                      className={`w-full text-left telemetry text-[11px] px-2 py-1 rounded-sm transition-colors ${
                        i === selectedIdx
                          ? 'bg-signal-ok/10 text-signal-ok border border-signal-ok/40'
                          : 'text-bone-200 hover:bg-white/[0.02] border border-transparent'
                      }`}
                    >
                      rev {r.rev}
                    </button>
                  </li>
                ))}
              </ul>

              <div>
                <p className="telemetry text-[10px] uppercase tracking-wider text-bone-300/80 mb-2">
                  diff: rev {state.data[selectedIdx]?.rev} vs rev {state.data[selectedIdx + 1]?.rev ?? '—'}
                </p>
                <pre className="telemetry text-[10.5px] leading-relaxed p-3 rounded-sm bg-ink-950 border border-line/60 max-h-[60vh] overflow-auto">
                  {state.data[selectedIdx] && state.data[selectedIdx + 1]
                    ? simpleDiff(
                        JSON.stringify(state.data[selectedIdx + 1]!.config, null, 2),
                        JSON.stringify(state.data[selectedIdx]!.config, null, 2),
                      ).map((d, i) => (
                        <div
                          key={i}
                          className={
                            d.tag === 'add'
                              ? 'text-signal-ok'
                              : d.tag === 'del'
                                ? 'text-signal-err'
                                : 'text-bone-200/80'
                          }
                        >
                          {d.tag === 'add' ? '+' : d.tag === 'del' ? '-' : ' '} {d.line}
                        </div>
                      ))
                    : 'Select two revisions to diff.'}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
