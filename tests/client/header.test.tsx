// @vitest-environment jsdom
/**
 * Header tests — split coverage (Codex Q4 + R5 WARN response):
 *
 * 1. relTime pure helper (9 cases) — node-friendly, no DOM needed.
 * 2. Component-lifecycle RTL tests (3 cases) — setInterval cleanup + pulse
 *    class lifecycle. Run in jsdom env so render() has a real DOM.
 *
 * The jsdom env at top of file unlocks @testing-library/react. Other test
 * files in tests/client/ stay on the default node env for speed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Header, relTime } from '../../src/client/components/Header';

describe('relTime (Header self-tick helper)', () => {
  const NOW = 1_779_065_100_000; // 2026-05-17T01:00:00Z

  it('1s ago', () => {
    expect(relTime(NOW - 1_000, NOW)).toBe('1s');
  });

  it('30s ago', () => {
    expect(relTime(NOW - 30_000, NOW)).toBe('30s');
  });

  it('clamps to 1s minimum when refreshedAt is in the future or now (no 0s display)', () => {
    expect(relTime(NOW, NOW)).toBe('1s');
    expect(relTime(NOW + 5_000, NOW)).toBe('1s');
  });

  it('59s ago', () => {
    expect(relTime(NOW - 59_000, NOW)).toBe('59s');
  });

  it('1m ago at exactly 60s', () => {
    expect(relTime(NOW - 60_000, NOW)).toBe('1m');
  });

  it('5m ago', () => {
    expect(relTime(NOW - 300_000, NOW)).toBe('5m');
  });

  it('59m ago', () => {
    expect(relTime(NOW - 59 * 60_000, NOW)).toBe('59m');
  });

  it('1h ago at exactly 60m', () => {
    expect(relTime(NOW - 60 * 60_000, NOW)).toBe('1h');
  });

  it('rounds seconds (38.6s ago → 39s)', () => {
    expect(relTime(NOW - 38_600, NOW)).toBe('39s');
  });
});

describe('Header component lifecycle (Codex Q4 RTL coverage)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders without crashing + shows the ago timestamp', () => {
    const t = Date.now();
    const { container } = render(<Header subreddit="cm_devvit_test" refreshedAt={t} />);
    const time = container.querySelector('time');
    expect(time).toBeTruthy();
    expect(time?.textContent ?? '').toMatch(/^\d+[smh] ago$/);
  });

  it('clears setInterval on unmount — no memory leak (Codex Q4 specific finding)', () => {
    // Spy on the real clearInterval BEFORE any fake-timers setup so the spy
    // captures the unmount cleanup call. vi.useFakeTimers + render +
    // useFakeTimer-managed cleanup interaction causes flakiness, so this test
    // uses real timers and just confirms the cleanup function fires.
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const before = clearSpy.mock.calls.length;
    const { unmount } = render(<Header subreddit="cm_devvit_test" refreshedAt={Date.now()} />);
    unmount();
    expect(clearSpy.mock.calls.length).toBeGreaterThan(before);
    clearSpy.mockRestore();
  });

  it('applies cm-refresh-pulse class on refreshedAt prop change', () => {
    const t0 = Date.now();
    const { rerender, container } = render(<Header subreddit="cm_devvit_test" refreshedAt={t0} />);
    rerender(<Header subreddit="cm_devvit_test" refreshedAt={t0 + 1000} />);
    const timeEl = container.querySelector('time');
    expect(timeEl?.className).toContain('cm-refresh-pulse');
  });

  it('subreddit name renders in header', () => {
    const { container } = render(<Header subreddit="cm_devvit_test" refreshedAt={Date.now()} />);
    expect(container.textContent).toContain('cm_devvit_test');
  });
});
