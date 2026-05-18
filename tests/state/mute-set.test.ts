import { describe, it, expect } from 'vitest';
import { ruleKey } from '../../src/state/muteSet';

describe('muteSet.ruleKey', () => {
  it('joins run + check with slash', () => {
    expect(ruleKey('spam-removal', 'crypto-giveaway')).toBe('spam-removal/crypto-giveaway');
  });

  it('handles empty parts (caller responsibility — just composes)', () => {
    expect(ruleKey('a', 'b')).toBe('a/b');
  });

  it('preserves dashes + underscores', () => {
    expect(ruleKey('low-karma_unverified', 'check-1')).toBe('low-karma_unverified/check-1');
  });
});
