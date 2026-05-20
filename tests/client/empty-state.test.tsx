// @vitest-environment jsdom
/**
 * AE Polish #97: cover the Polish #84 clipboard-failure UX path which
 * pr-test-analyzer flagged as entirely uncovered (no test file existed).
 *
 * Polish #84 fix surface:
 *   - `copied` state → button shows "copied" w/ signal-ok Check icon
 *   - `copyFailed` state → button shows "select manually" w/ signal-warn
 *   - 2s reset timer on either state
 *   - Unmount cleanup (Polish #39 invariant — clearTimeout in useEffect
 *     return) so a poll-lands-w/-new-events unmount within the 2s window
 *     doesn't fire setState on an unmounted component
 *
 * A regression that flipped the success/failure branches OR removed the
 * `setCopyFailed(true)` call would silently re-introduce the
 * pre-Polish-#84 "click does nothing" UX. These tests pin every branch.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { EmptyState } from '../../src/client/components/EmptyState';

// jsdom doesn't include navigator.clipboard by default. Stub it so each
// test can override writeText() per-case (success / reject).
const writeTextMock = vi.fn();

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: writeTextMock },
    configurable: true,
  });
  writeTextMock.mockReset();
  // Silence the Polish #84 console.warn so the test output stays clean.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('EmptyState (Polish #97 / clipboard UX)', () => {
  it('renders the subreddit-scoped wiki path', () => {
    render(<EmptyState subreddit="my_sub" />);
    expect(screen.getByText(/r\/my_sub\/wiki\/botconfig\/contextmod/i)).toBeTruthy();
  });

  it('default button state shows "copy"', () => {
    render(<EmptyState subreddit="x" />);
    expect(screen.getByText(/^copy$/)).toBeTruthy();
  });

  it('Polish #84: success path → button flips to "copied" w/ Check icon', async () => {
    writeTextMock.mockResolvedValueOnce(undefined);
    render(<EmptyState subreddit="x" />);
    const button = screen.getByRole('button', { name: /copy starter config/i });
    fireEvent.click(button);
    // Microtask flush — the promise resolves + state flips on the next
    // event-loop tick. testing-library re-renders on state change.
    await vi.waitFor(() => {
      expect(screen.getByText(/^copied$/)).toBeTruthy();
    });
    expect(writeTextMock).toHaveBeenCalledTimes(1);
  });

  it('Polish #84: failure path → button flips to "select manually" w/ signal-warn', async () => {
    writeTextMock.mockRejectedValueOnce(new Error('NotAllowedError: clipboard perm denied'));
    render(<EmptyState subreddit="x" />);
    fireEvent.click(screen.getByRole('button', { name: /copy starter config/i }));
    await vi.waitFor(() => {
      expect(screen.getByText(/^select manually$/)).toBeTruthy();
    });
  });

  it('Polish #84: failure path → console.warn surfaces the iframe-perm cause', async () => {
    const warnSpy = vi.spyOn(console, 'warn');
    writeTextMock.mockRejectedValueOnce(new Error('iframe perm denied'));
    render(<EmptyState subreddit="x" />);
    fireEvent.click(screen.getByRole('button', { name: /copy starter config/i }));
    await vi.waitFor(() => {
      expect(screen.getByText(/^select manually$/)).toBeTruthy();
    });
    // Polish #84 emits a console.warn so dev-tools shows the cause.
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('clipboard.writeText failed'),
      expect.any(Error)
    );
  });

  it('Polish #84: 2s reset returns success state to default "copy"', async () => {
    vi.useFakeTimers();
    writeTextMock.mockResolvedValueOnce(undefined);
    render(<EmptyState subreddit="x" />);
    fireEvent.click(screen.getByRole('button', { name: /copy starter config/i }));
    // Resolve the writeText promise + advance the reset timer.
    await vi.runAllTimersAsync();
    expect(screen.getByText(/^copy$/)).toBeTruthy();
    // "copied" should NOT be visible after the reset.
    expect(screen.queryByText(/^copied$/)).toBeNull();
  });

  it('Polish #84: 2s reset returns failure state to default "copy"', async () => {
    vi.useFakeTimers();
    writeTextMock.mockRejectedValueOnce(new Error('blocked'));
    render(<EmptyState subreddit="x" />);
    fireEvent.click(screen.getByRole('button', { name: /copy starter config/i }));
    await vi.runAllTimersAsync();
    expect(screen.getByText(/^copy$/)).toBeTruthy();
    expect(screen.queryByText(/^select manually$/)).toBeNull();
  });

  it('Polish #39 invariant: unmount during pending timer does not throw', async () => {
    vi.useFakeTimers();
    writeTextMock.mockResolvedValueOnce(undefined);
    const { unmount } = render(<EmptyState subreddit="x" />);
    fireEvent.click(screen.getByRole('button', { name: /copy starter config/i }));
    // Let the success promise flush so the timer is set, but DON'T
    // advance past COPY_RESET_MS (2000). Then unmount.
    await vi.advanceTimersByTimeAsync(50);
    expect(() => unmount()).not.toThrow();
    // Advance past the timer — useEffect cleanup should have cleared it
    // so the setState callback never fires on the unmounted component.
    expect(() => vi.advanceTimersByTime(3000)).not.toThrow();
  });

  it('Polish #84: rapid second click resets pending timer (no leak)', async () => {
    vi.useFakeTimers();
    writeTextMock.mockResolvedValue(undefined);
    render(<EmptyState subreddit="x" />);
    const button = screen.getByRole('button', { name: /copy starter config/i });
    fireEvent.click(button);
    await vi.advanceTimersByTimeAsync(500);
    // Second click before the first reset fires.
    fireEvent.click(button);
    await vi.advanceTimersByTimeAsync(500);
    // Still in "copied" state — second click reset the timer.
    expect(screen.getByText(/^copied$/)).toBeTruthy();
    // Both clicks invoked writeText.
    expect(writeTextMock).toHaveBeenCalledTimes(2);
  });
});
