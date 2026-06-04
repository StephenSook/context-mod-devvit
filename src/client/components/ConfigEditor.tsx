/**
 * ConfigEditor — CodeMirror 6 editor wired to the app JSON Schema.
 *
 * Provides syntax highlighting, inline lint markers, autocompletion, and hover
 * documentation for both YAML and JSON formats, driven by the same
 * app.schema.json that AJV uses server-side for validation.
 *
 * Format-change causes a full editor teardown+recreate (different language +
 * schema extension). External value changes (load, reload, conflict-reload) are
 * patched in via a single dispatch without recreating the editor, preserving
 * undo history and cursor position when possible.
 */
import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { yaml } from '@codemirror/lang-yaml';
import { json } from '@codemirror/lang-json';
import { lintGutter } from '@codemirror/lint';
import { jsonSchema } from 'codemirror-json-schema';
import { yamlSchema } from 'codemirror-json-schema/yaml';
import type { JSONSchema7 } from 'json-schema';
import appSchemaRaw from '../../schema/app.schema.json';

// Cast the bundled JSON to JSONSchema7 so the schema extension functions accept
// it without complaint. The schema IS draft-07 so the cast is semantically
// correct. Using `unknown` as the intermediate step is the type-safe way to
// cross runtime / declaration boundaries when the import type is `object`.
const appSchema = appSchemaRaw as unknown as JSONSchema7;

// Devvit may enforce a strict style-src; pass the nonce if the platform
// injects one via a <meta property="csp-nonce"> tag. Guard against jsdom /
// SSR where document may not have that element.
function readCspNonce(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return (
    (document.querySelector('meta[property="csp-nonce"]') as HTMLMetaElement | null)?.content ??
    undefined
  );
}

export interface ConfigEditorProps {
  value: string;
  format: 'yaml' | 'json';
  onChange: (text: string) => void;
}

export function ConfigEditor({ value, format, onChange }: ConfigEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);

  // Create / recreate the editor when the format changes (the language extension
  // and schema extension both differ). The onChange closure is captured via a
  // stable ref so that switching format doesn't re-trigger this effect.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (!host.current) return;

    const schemaExt =
      format === 'json' ? jsonSchema(appSchema) : yamlSchema(appSchema);

    const nonce = readCspNonce();

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        format === 'json' ? json() : yaml(),
        ...schemaExt,
        lintGutter(),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChangeRef.current(u.state.doc.toString());
        }),
        ...(nonce ? [EditorView.cspNonce.of(nonce)] : []),
        EditorView.theme({ '&': { height: '100%', fontSize: '13px' } }),
      ],
    });

    view.current = new EditorView({ state, parent: host.current });

    return () => {
      view.current?.destroy();
      view.current = null;
    };
    // Recreate only on format change. External value edits handled by the sync
    // effect below. `value` and `onChange` are intentionally omitted from the
    // dep array: value changes are applied via dispatch (no recreate needed),
    // and onChange is captured through onChangeRef so its identity is stable.
  }, [format]);

  // Sync EXTERNAL value changes (async load, reload, conflict-reload) into the
  // live editor without recreating it. The identity guard prevents a feedback
  // loop: a user keystroke flows out via onChange -> parent state -> value prop,
  // but value already equals the current doc, so no dispatch fires.
  useEffect(() => {
    const v = view.current;
    if (v && value !== v.state.doc.toString()) {
      v.dispatch({
        changes: { from: 0, to: v.state.doc.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={host} className="cm-host h-full w-full overflow-hidden" />;
}
