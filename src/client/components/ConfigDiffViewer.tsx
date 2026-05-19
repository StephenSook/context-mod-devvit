import { useEffect, useState } from 'react';
import type { ApiResult } from '../lib/types';

export type ConfigRev = { rev: number; config: unknown };

async function fetchConfigHistory(): Promise<ApiResult<ConfigRev[]>> {
  const demo =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('demo') === '1';
  const url = `/api/config-history${demo ? '?demo=1' : ''}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      // Try to parse server error envelope for an actionable msg
      let serverErr: string | null = null;
      try {
        const body = await res.json();
        if (body && typeof body === 'object' && 'error' in body) {
          serverErr = String((body as { error: unknown }).error);
        }
      } catch {
        // body not JSON — fall through to HTTP status
      }
      return { ok: false, error: serverErr ?? `HTTP ${res.status}` };
    }
    const data = await res.json();
    const revs = Array.isArray(data?.revs) ? (data.revs as ConfigRev[]) : [];
    if (revs.length === 0) return { ok: true, empty: true };
    return { ok: true, empty: false, data: revs };
  } catch (err) {
    // Log url + stack for repro before mapping to user-facing string
    console.error('[cm/config-diff] fetch failed', url, err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Positional LCS-based line diff. Set-diff would be wrong because postBehavior
 * + check ordering matter in ContextMod — reordered lines are not "same".
 *
 * Algorithm: classic LCS DP table, then walk back to emit add/del/same tags in
 * the original order. O(n*m) for n+m lines; fine for typical 20-60-line configs.
 *
 * AE Polish #52 — MAX_LINES guard. A 1000-line config (100+ rules, deeply
 * nested namedRules) would produce a 1000x1000 dp table (8MB heap) and
 * potentially hang the browser for a second on each diff render. Cap at
 * 500 lines per side (10x the typical max wiki-config length). Above the
 * cap, return a single "too-large" marker so the UI surfaces it cleanly
 * vs silently lagging. Mods w/ truly huge configs can use git/external
 * diff tools — the dashboard's purpose is glanceable not source-of-truth.
 */
export const DIFF_MAX_LINES = 500;
export type DiffEntry = { line: string; tag: 'add' | 'del' | 'same' | 'too-large' };
export function simpleDiff(a: string, b: string): DiffEntry[] {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  if (aLines.length > DIFF_MAX_LINES || bLines.length > DIFF_MAX_LINES) {
    return [
      {
        line: `Config too large for inline diff (${aLines.length} vs ${bLines.length} lines, cap ${DIFF_MAX_LINES}). Use git or an external diff tool.`,
        tag: 'too-large',
      },
    ];
  }
  const n = aLines.length;
  const m = bLines.length;
  // DP table of LCS lengths
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (aLines[i] === bLines[j]) {
        dp[i]![j] = (dp[i + 1]?.[j + 1] ?? 0) + 1;
      } else {
        dp[i]![j] = Math.max(dp[i + 1]?.[j] ?? 0, dp[i]?.[j + 1] ?? 0);
      }
    }
  }
  // Walk forward emitting tags
  const out: { line: string; tag: 'add' | 'del' | 'same' }[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (aLines[i] === bLines[j]) {
      out.push({ line: aLines[i]!, tag: 'same' });
      i++;
      j++;
    } else if ((dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) {
      out.push({ line: aLines[i]!, tag: 'del' });
      i++;
    } else {
      out.push({ line: bLines[j]!, tag: 'add' });
      j++;
    }
  }
  while (i < n) {
    out.push({ line: aLines[i]!, tag: 'del' });
    i++;
  }
  while (j < m) {
    out.push({ line: bLines[j]!, tag: 'add' });
    j++;
  }
  return out;
}

// Z3-X51: function declaration kept named so the existing 7-test suite
// imports work; a default export below enables React.lazy. ~3KB of diff
// algorithm + UI out of the initial bundle.
function ConfigDiffViewer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, setState] = useState<ApiResult<ConfigRev[]>>({
    ok: true,
    empty: true,
  });
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
                  diff: rev {state.data[selectedIdx]?.rev} vs rev{' '}
                  {state.data[selectedIdx + 1]?.rev ?? '—'}
                </p>
                <pre className="telemetry text-[10.5px] leading-relaxed p-3 rounded-sm bg-ink-950 border border-line/60 max-h-[60vh] overflow-auto">
                  {state.data[selectedIdx] && state.data[selectedIdx + 1]
                    ? simpleDiff(
                        JSON.stringify(state.data[selectedIdx + 1]!.config, null, 2),
                        JSON.stringify(state.data[selectedIdx]!.config, null, 2)
                      ).map((d, i) => (
                        <div
                          key={i}
                          className={
                            d.tag === 'add'
                              ? 'text-signal-ok'
                              : d.tag === 'del'
                                ? 'text-signal-err'
                                : d.tag === 'too-large'
                                  ? 'text-signal-warn'
                                  : 'text-bone-200/80'
                          }
                        >
                          {d.tag === 'add'
                            ? '+'
                            : d.tag === 'del'
                              ? '-'
                              : d.tag === 'too-large'
                                ? '⚠'
                                : ' '}{' '}
                          {d.line}
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

export default ConfigDiffViewer;
export { ConfigDiffViewer };
