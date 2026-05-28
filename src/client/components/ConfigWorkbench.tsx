/**
 * ConfigWorkbench — full-screen config editor overlay.
 *
 * Renders ConfigEditor full-width (no preview pane yet; PreviewPane is
 * added in Task 13). Handles load, debounced validation, save, and
 * optimistic-lock conflict detection.
 *
 * baseRev-refresh invariant: after a successful save the wiki revisionId
 * is re-fetched (via load()) so a second save in the same session does
 * not false-conflict with a 409. The /save response returns internal
 * rev + ruleCount, NOT the wiki revisionId, so we cannot derive it from
 * the save response alone.
 */
import { useEffect, useRef, useState } from 'react';
import { ConfigEditor } from './ConfigEditor';
import { fetchConfigRawSafe, validateConfigSafe, saveConfigSafe } from '../lib/api';

function detectFormat(text: string): 'yaml' | 'json' {
  const t = text.trimStart();
  return t.startsWith('{') || t.startsWith('[') ? 'json' : 'yaml';
}

export function ConfigWorkbench({ subreddit, onClose }: { subreddit: string; onClose: () => void }) {
  const [text, setText] = useState('');
  const [format, setFormat] = useState<'yaml' | 'json'>('yaml');
  const [baseRev, setBaseRev] = useState<string | null>(null);
  const [valid, setValid] = useState<boolean | null>(null);
  const [status, setStatus] = useState('Loading...');
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Load (and re-load) the raw config from the wiki.
   * statusOverride lets a post-save call keep the "Saved" message visible
   * while still refreshing baseRev to the current wiki revisionId.
   */
  async function load(statusOverride?: string) {
    const r = await fetchConfigRawSafe();
    if (r.ok && !r.empty) {
      setText(r.data.content);
      setFormat(detectFormat(r.data.content));
      setBaseRev(r.data.revisionId);
      setConflict(false);
      setStatus(statusOverride ?? (r.data.isDefaultTemplate ? 'New config (starter template)' : 'Loaded'));
    } else {
      setStatus(r.ok ? 'Empty' : `Load failed: ${r.error}`);
    }
  }

  useEffect(() => { void load(); }, []); // load is stable: defined inside the component, only calls setters

  useEffect(() => {
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, []);

  function onChange(next: string) {
    setText(next);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const v = await validateConfigSafe(next);
      setValid(v.ok);
    }, 600);
  }

  async function onSave() {
    if (saving || valid === false) return;
    setSaving(true);
    setStatus('Saving...');
    try {
      const r = await saveConfigSafe(text, baseRev);
      if (r.ok && !r.empty) {
        // Refresh baseRev from the wiki so a subsequent save does not
        // false-conflict. Keep the Saved status visible during the re-fetch.
        await load(`Saved. ${r.data.ruleCount} rules live (rev ${r.data.rev}).`);
      } else {
        const msg = r.ok ? 'Saved' : r.error;
        setStatus(`Save failed: ${msg}`);
        if (!r.ok && /wiki changed/i.test(r.error)) setConflict(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cm-workbench fixed inset-0 z-50 flex flex-col bg-ink-900 text-bone-100">
      <header className="flex items-center justify-between px-4 py-2 border-b border-line">
        <span className="text-sm font-medium">Edit config: r/{subreddit}</span>
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => setFormat((f) => (f === 'yaml' ? 'json' : 'yaml'))}
            title="Toggle format"
            className="px-1.5 py-0.5 rounded border border-line text-bone-300 hover:text-bone-50 hover:border-bone-400 transition-colors"
          >
            {format.toUpperCase()}
          </button>
          <span aria-live="polite" className={valid === false ? 'text-signal-err' : valid === true ? 'text-signal-ok' : 'text-bone-300/0'}>
            {valid === false ? 'invalid' : valid === true ? 'valid' : ''}
          </span>
          {conflict && (
            <button
              onClick={() => void load()}
              className="px-1.5 py-0.5 rounded border border-signal-warn/60 text-signal-warn hover:bg-signal-warn/10 transition-colors"
            >
              Reload
            </button>
          )}
          <button
            onClick={() => void onSave()}
            disabled={saving || valid === false}
            className="px-2 py-1 rounded bg-signal-ok/20 text-signal-ok hover:bg-signal-ok/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
          <button
            onClick={onClose}
            aria-label="Close editor"
            className="px-1.5 py-0.5 rounded text-bone-300 hover:text-bone-50 transition-colors"
          >
            Close
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <ConfigEditor value={text} format={format} onChange={onChange} />
      </div>

      <footer className="px-4 py-1 text-[11px] text-bone-300 border-t border-line" aria-live="polite">
        {status}
      </footer>
    </div>
  );
}
