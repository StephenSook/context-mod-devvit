/**
 * Header test boundary (Codex Q4 WARN response, 2026-05-17):
 *
 * THIS FILE: unit tests for the pure `relTime(refreshedAt, now)` helper.
 * That's safe to test in node environment with no DOM.
 *
 * COMPONENT BEHAVIOR (setInterval cleanup on unmount + cm-refresh-pulse class
 * applied/removed on refreshedAt prop change): verified via Playwright MCP
 * against the live `npm run dev:web` build with `?demo=1`. See P4.5 of
 * `docs/superpowers/plans/2026-05-17-pre-bed-polish.md` for the exact
 * `browser_evaluate` script that confirms (a) text decrements smoothly between
 * polls, (b) `cm-refresh-pulse` class is applied during the 1.5s window after
 * prop change, (c) 0 console errors/warnings.
 *
 * We deliberately don't pull in @testing-library/react + jsdom for this single
 * component pre-hackathon-submit: the dependency-tree risk on a T-10 night
 * exceeds the value of unit-vs-e2e coverage for a 75-line component. Add it
 * post-hackathon if the Header surface grows.
 */
import { describe, it, expect } from 'vitest';
import { relTime } from '../../src/client/components/Header';

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
