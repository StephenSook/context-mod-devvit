// @vitest-environment jsdom
/**
 * ConfigEditor tests — CodeMirror 6 component.
 *
 * jsdom env required: EditorView mounts a real DOM tree. CM6 v6 supports jsdom
 * for unit tests; the editor creates a `.cm-editor` wrapper div and injects
 * content into `.cm-content` / `.cm-line` children.
 *
 * Value-sync test strategy: CM6 renders each doc line as a `.cm-line` span.
 * After a dispatch the DOM updates synchronously (CM6 batch-commits inside the
 * same microtask as the dispatch). We query `.cm-line` text to confirm the new
 * value is reflected in the editor DOM.
 */
import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { ConfigEditor } from '../../src/client/components/ConfigEditor';

describe('ConfigEditor', () => {
  it('mounts and renders the initial document', () => {
    const { container } = render(
      <ConfigEditor value={'runs: []'} format={'yaml'} onChange={() => {}} />
    );
    expect(container.querySelector('.cm-editor')).toBeTruthy();
    expect(container.textContent).toContain('runs');
  });

  it('syncs an external value change into the editor', () => {
    const { container, rerender } = render(
      <ConfigEditor value={'runs: []'} format={'yaml'} onChange={() => {}} />
    );
    act(() => {
      rerender(<ConfigEditor value={'runs: [a]'} format={'yaml'} onChange={() => {}} />);
    });
    expect(container.textContent).toContain('[a]');
  });
});
