/**
 * AE CRITICAL #4 — hard-mute regression suite for runCheck.
 *
 * The v0.3.0 mute MVP claimed dashboard mute → bot stops firing, but the
 * backend wiring landed only in v0.5.5 (this commit). These tests pin
 * the contract so a future refactor that drops the mute check fails CI
 * loudly instead of silently re-enabling false advertising.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const isRuleMutedMock = vi.fn<(sub: string, runName: string, checkName: string) => Promise<boolean>>();

vi.mock('../../src/state/muteSet', () => ({
  isRuleMuted: (...args: [string, string, string]) => isRuleMutedMock(...args),
}));

import { runCheck } from '../../src/core/runCheck';
import type { Item, Author, Rule, Action } from '../../src/shared/types';

const baseItem: Item = {
  id: 't3_a',
  title: 'matches',
  body: '',
  url: '',
  author: 'u',
  age: 0,
  score: 0,
  isSelf: false,
  over18: false,
  removed: false,
  approved: false,
  locked: false,
  stickied: false,
  linkFlairText: null,
};

const baseAuthor: Author = {
  name: 'u',
  id: 't2_z',
  age: 0,
  linkKarma: 0,
  commentKarma: 0,
  flairText: null,
  isMod: false,
  isContributor: false,
  verified: false,
  shadowBanned: false,
};

const ruleHit: Rule = { kind: 'regex', pattern: 'matches' };
const removeAction: Action = { kind: 'remove' };

describe('runCheck — hard-mute (AE CRITICAL #4)', () => {
  beforeEach(() => {
    isRuleMutedMock.mockReset();
  });

  it('isRuleMuted(true) → check short-circuits as not-triggered, no actions', async () => {
    isRuleMutedMock.mockResolvedValue(true);
    const r = await runCheck(
      {
        name: 'block-scam',
        combinator: 'AND',
        rules: [ruleHit],
        actions: [removeAction],
      },
      baseItem,
      baseAuthor,
      'r_test',
      'spam-run'
    );
    expect(r.triggered).toBe(false);
    expect(r.actions).toEqual([]);
    expect(r.checkName).toBe('block-scam');
    expect(isRuleMutedMock).toHaveBeenCalledWith('r_test', 'spam-run', 'block-scam');
  });

  it('isRuleMuted(false) → check evaluates normally', async () => {
    isRuleMutedMock.mockResolvedValue(false);
    const r = await runCheck(
      {
        name: 'block-scam',
        combinator: 'AND',
        rules: [ruleHit],
        actions: [removeAction],
      },
      baseItem,
      baseAuthor,
      'r_test',
      'spam-run'
    );
    expect(r.triggered).toBe(true);
    expect(r.actions).toEqual([removeAction]);
  });

  it('mute check skipped when sub or runName missing (dry-run sibling path)', async () => {
    isRuleMutedMock.mockResolvedValue(true);
    const r = await runCheck(
      {
        name: 'block-scam',
        combinator: 'AND',
        rules: [ruleHit],
        actions: [removeAction],
      },
      baseItem,
      baseAuthor
      // no sub, no runName
    );
    expect(r.triggered).toBe(true);
    expect(isRuleMutedMock).not.toHaveBeenCalled();
  });

  it('mute check fail-OPEN on Redis blip — handled by muteSet impl, not runCheck', async () => {
    // Verify runCheck doesn't second-guess muteSet's fail-open. If muteSet
    // returns false (per its X48 fail-open contract on Redis error),
    // runCheck proceeds as if not muted — soft-fail is the intended UX.
    isRuleMutedMock.mockResolvedValue(false);
    const r = await runCheck(
      {
        name: 'block-scam',
        combinator: 'AND',
        rules: [ruleHit],
        actions: [removeAction],
      },
      baseItem,
      baseAuthor,
      'r_test',
      'spam-run'
    );
    expect(r.triggered).toBe(true);
  });
});
