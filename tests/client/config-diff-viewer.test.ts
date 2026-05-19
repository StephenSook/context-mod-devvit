import { describe, it, expect } from 'vitest';
import { simpleDiff } from '../../src/client/components/ConfigDiffViewer';

describe('simpleDiff (Wave U CRITICAL — LCS-based, not set-diff)', () => {
  it('identical inputs → all "same"', () => {
    const result = simpleDiff('a\nb\nc', 'a\nb\nc');
    expect(result).toHaveLength(3);
    expect(result.every((d) => d.tag === 'same')).toBe(true);
  });

  it('added lines tagged "add"', () => {
    const result = simpleDiff('a\nb', 'a\nb\nc');
    const adds = result.filter((d) => d.tag === 'add');
    expect(adds).toHaveLength(1);
    expect(adds[0]?.line).toBe('c');
  });

  it('removed lines tagged "del"', () => {
    const result = simpleDiff('a\nb\nc', 'a\nc');
    const dels = result.filter((d) => d.tag === 'del');
    expect(dels).toHaveLength(1);
    expect(dels[0]?.line).toBe('b');
  });

  it('changed lines surface as add+del pair', () => {
    const result = simpleDiff('foo\nbar', 'foo\nbaz');
    expect(result.some((d) => d.tag === 'del' && d.line === 'bar')).toBe(true);
    expect(result.some((d) => d.tag === 'add' && d.line === 'baz')).toBe(true);
  });

  it('empty inputs return empty', () => {
    expect(simpleDiff('', '')).toEqual([{ line: '', tag: 'same' }]);
  });

  it('Wave U fix — duplicate lines preserved (set-diff bug)', () => {
    // Old set-diff collapsed duplicates: 'a\nb\na' vs 'a\nb' showed 3x "same"
    // because the set saw 'a' as one entry. LCS preserves positional duplicates.
    const result = simpleDiff('a\nb\na', 'a\nb');
    const dels = result.filter((d) => d.tag === 'del');
    expect(dels).toHaveLength(1);
    expect(dels[0]?.line).toBe('a');
  });

  it('Wave U fix — reordered lines surface as add+del (set-diff bug)', () => {
    // Old set-diff marked reordered lines as "same" — silently hid order changes
    // that DO matter in ContextMod configs (postBehavior + check-order).
    const result = simpleDiff('a\nb\nc', 'c\nb\na');
    // Must surface SOME add/del to indicate ordering changed
    const sameCount = result.filter((d) => d.tag === 'same').length;
    expect(sameCount).toBeLessThan(3);
  });

  it('Polish #52: input >DIFF_MAX_LINES → too-large marker, no O(n*m) compute', () => {
    // A 1000-line config (rare but possible w/ deep namedRules nesting) would
    // produce a 1000x1000 dp table = ~8MB heap + potentially second-long hang.
    // Cap at 500 lines per side. Above cap → single too-large entry, no compute.
    const huge = Array.from({ length: 501 }, (_, i) => `line ${i}`).join('\n');
    const small = 'a\nb\nc';
    const start = Date.now();
    const result = simpleDiff(huge, small);
    const elapsed = Date.now() - start;
    expect(result).toHaveLength(1);
    expect(result[0]?.tag).toBe('too-large');
    expect(result[0]?.line).toMatch(/too large/i);
    expect(result[0]?.line).toMatch(/501/);
    expect(result[0]?.line).toMatch(/500/); // cap value mentioned
    expect(elapsed).toBeLessThan(100); // short-circuit, no LCS compute
  });

  it('Polish #52: both sides at boundary (500 lines) still run full diff', () => {
    // Cap is "strictly greater than" 500, so exactly 500 lines per side
    // should run the full LCS compute without short-circuiting.
    const lines = Array.from({ length: 500 }, (_, i) => `line ${i}`);
    const result = simpleDiff(lines.join('\n'), lines.join('\n'));
    expect(result.filter((d) => d.tag === 'too-large')).toHaveLength(0);
    expect(result.filter((d) => d.tag === 'same')).toHaveLength(500);
  });
});
