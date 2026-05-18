// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { useKeyboardShortcuts } from '../../src/client/hooks/useKeyboardShortcuts';

function TestHarness({
  onR,
  onQuestion,
}: {
  onR: () => void;
  onQuestion: () => void;
}) {
  useKeyboardShortcuts([
    { key: 'r', label: 'reload', handler: onR },
    { key: '?', label: 'help', handler: onQuestion },
  ]);
  return <input data-testid="text-input" placeholder="type here" />;
}

afterEach(() => cleanup());

describe('useKeyboardShortcuts', () => {
  it('fires handler when matching key pressed globally', () => {
    const onR = vi.fn();
    const onQ = vi.fn();
    render(<TestHarness onR={onR} onQuestion={onQ} />);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
    expect(onR).toHaveBeenCalledTimes(1);
    expect(onQ).not.toHaveBeenCalled();
  });

  it('does NOT fire when focus is in an INPUT', () => {
    const onR = vi.fn();
    const { getByTestId } = render(
      <TestHarness onR={onR} onQuestion={vi.fn()} />
    );
    const input = getByTestId('text-input');
    input.focus();
    // Simulate keydown w/ target = input
    const evt = new KeyboardEvent('keydown', { key: 'r' });
    Object.defineProperty(evt, 'target', { value: input });
    window.dispatchEvent(evt);
    expect(onR).not.toHaveBeenCalled();
  });

  it('does NOT fire when modifier keys held (cmd+R is browser refresh)', () => {
    const onR = vi.fn();
    render(<TestHarness onR={onR} onQuestion={vi.fn()} />);
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'r', metaKey: true })
    );
    expect(onR).not.toHaveBeenCalled();
  });

  it('fires for ? key', () => {
    const onQ = vi.fn();
    render(<TestHarness onR={vi.fn()} onQuestion={onQ} />);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
    expect(onQ).toHaveBeenCalledTimes(1);
  });

  it('cleans up listener on unmount', () => {
    const onR = vi.fn();
    const { unmount } = render(<TestHarness onR={onR} onQuestion={vi.fn()} />);
    unmount();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
    expect(onR).not.toHaveBeenCalled();
  });
});
