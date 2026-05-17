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
});
