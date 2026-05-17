import { useEffect, useState } from 'react';
import type { ApiResult } from '../lib/types';

type ModActivity = {
  ts: number;
  actor: string;
  kind: string;
  detail?: string;
};

async function fetchModActivity(): Promise<ApiResult<ModActivity[]>> {
  try {
    const demo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1';
    const res = await fetch(`/api/mod-activity${demo ? '?demo=1' : ''}`);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    const activity = Array.isArray(data?.activity) ? (data.activity as ModActivity[]) : [];
    if (activity.length === 0) return { ok: true, empty: true };
    return { ok: true, empty: false, data: activity };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function relTimeShort(ts: number, now: number = Date.now()): string {
  const s = Math.max(1, Math.round((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ModActivityFeed({ refreshedAt }: { refreshedAt: number }) {
  const [state, setState] = useState<ApiResult<ModActivity[]>>({ ok: true, empty: true });

  useEffect(() => {
    void fetchModActivity().then(setState);
  }, [refreshedAt]);

  if (!state.ok) {
    // Wave U WARN fix (Codex CR3 #8): render a small caption on infra failure
    // so mods see "activity feed unavailable" instead of silent null (which is
    // visually identical to genuinely-empty activity).
    return (
      <div className="cm-fade-up px-5 py-2 border-t border-line/40" style={{ animationDelay: '0.6s' }}>
        <p className="telemetry text-[10px] text-bone-300/60">
          mod activity feed unavailable: {state.error}
        </p>
      </div>
    );
  }
  if (state.empty) return null;

  return (
    <div className="cm-fade-up px-5 py-2 border-t border-line/40" style={{ animationDelay: '0.6s' }}>
      <h2 className="text-[11px] tracking-[0.18em] uppercase text-bone-300 font-medium mb-1.5">
        mod <span className="font-serif italic normal-case tracking-normal text-bone-200/80">activity</span>
      </h2>
      <ul className="space-y-0.5">
        {state.data.slice(0, 5).map((a, i) => (
          <li
            key={`${a.ts}-${i}`}
            className="text-[10.5px] text-bone-200/80 flex items-baseline gap-2"
          >
            <span className="telemetry text-bone-300/70 tabular-nums w-[60px] shrink-0">
              {relTimeShort(a.ts)}
            </span>
            <span className="text-bone-100">u/{a.actor}</span>
            <span className="text-bone-300/70">·</span>
            <span className="telemetry text-bone-200/80">{a.kind}</span>
            {a.detail && (
              <span className="telemetry text-bone-300/60 truncate">{a.detail}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
