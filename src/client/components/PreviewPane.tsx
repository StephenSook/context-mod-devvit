import { useEffect, useRef, useState } from 'react';
import { simulateLiveSafe, explainConfigSafe } from '../lib/api';
import { simpleDiff } from './ConfigDiffViewer';

type Tab = 'impact' | 'explain' | 'diff';

export function PreviewPane({ text, currentText }: { text: string; currentText: string }) {
  const [tab, setTab] = useState<Tab>('impact');
  const [impact, setImpact] = useState('Edit to preview impact.');
  const [explanation, setExplanation] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (tab !== 'impact') return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const r = await simulateLiveSafe(text);
      setImpact(
        r.ok && !r.empty
          ? `Would fire on ${r.data.firedCount}/${r.data.totalSamples} recent items`
          : r.ok
            ? 'No result.'
            : r.error
      );
    }, 700);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [text, tab]);

  async function runExplain() {
    setExplanation('...');
    const r = await explainConfigSafe(text);
    setExplanation(
      r.ok && !r.empty
        ? r.data
        : `Explain failed: ${r.ok ? 'empty' : r.error}`
    );
  }

  const diffLines = simpleDiff(currentText, text);

  return (
    <div className="flex flex-col h-full border-l border-line">
      <div role="tablist" className="flex gap-2 px-3 py-2 border-b border-line text-xs">
        <button
          role="tab"
          id="cm-tab-impact"
          aria-selected={tab === 'impact'}
          aria-controls="cm-tabpanel"
          onClick={() => setTab('impact')}
          className={`px-2 py-0.5 rounded transition-colors ${tab === 'impact' ? 'text-signal-ok border border-signal-ok/40 bg-signal-ok/10' : 'text-bone-300 hover:text-bone-50'}`}
        >
          Impact
        </button>
        <button
          role="tab"
          id="cm-tab-explain"
          aria-selected={tab === 'explain'}
          aria-controls="cm-tabpanel"
          onClick={() => setTab('explain')}
          className={`px-2 py-0.5 rounded transition-colors ${tab === 'explain' ? 'text-signal-ok border border-signal-ok/40 bg-signal-ok/10' : 'text-bone-300 hover:text-bone-50'}`}
        >
          Explain
        </button>
        <button
          role="tab"
          id="cm-tab-diff"
          aria-selected={tab === 'diff'}
          aria-controls="cm-tabpanel"
          onClick={() => setTab('diff')}
          className={`px-2 py-0.5 rounded transition-colors ${tab === 'diff' ? 'text-signal-ok border border-signal-ok/40 bg-signal-ok/10' : 'text-bone-300 hover:text-bone-50'}`}
        >
          Diff
        </button>
      </div>

      <div
        role="tabpanel"
        id="cm-tabpanel"
        aria-labelledby={`cm-tab-${tab}`}
        tabIndex={0}
        className="flex-1 overflow-auto p-3 text-xs"
      >
        {tab === 'impact' && <p className="text-bone-200 whitespace-pre-wrap">{impact}</p>}

        {tab === 'explain' && (
          <div>
            <button
              onClick={() => void runExplain()}
              className="mb-2 underline text-bone-300 hover:text-bone-50 transition-colors"
            >
              Explain with AI
            </button>
            <pre className="whitespace-pre-wrap text-bone-200">{explanation}</pre>
          </div>
        )}

        {tab === 'diff' && (
          <pre className="telemetry text-[10.5px] leading-relaxed">
            {!diffLines.some((d) => d.tag === 'add' || d.tag === 'del') ? (
              <span className="text-bone-300/70">No changes.</span>
            ) : (
              diffLines.map((d, i) => (
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
                        ? '!'
                        : ' '}{' '}
                  {d.line}
                </div>
              ))
            )}
          </pre>
        )}
      </div>
    </div>
  );
}
