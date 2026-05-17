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
