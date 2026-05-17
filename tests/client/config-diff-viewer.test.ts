import { describe, it, expect } from 'vitest';
import { simpleDiff } from '../../src/client/components/ConfigDiffViewer';

describe('simpleDiff', () => {
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
});
