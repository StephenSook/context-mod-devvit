import { describe, it, expect, vi, beforeEach } from 'vitest';

const getUserByUsername = vi.fn();
vi.mock('@devvit/web/server', () => ({
  reddit: {
    getUserByUsername: (...args: unknown[]) => getUserByUsername(...args),
  },
}));

import {
  normalizePost,
  normalizeComment,
  computeNeedsAuthorEnrichment,
  BadTriggerIdError,
} from '../../src/shared/normalize';
import type { AppConfig } from '../../src/shared/types';

const baseConfig: AppConfig = { runs: [], needsAuthorEnrichment: false };

describe('normalizePost', () => {
  beforeEach(() => {
    getUserByUsername.mockReset();
  });

  it('produces a fully-populated Item + Author with no undefined fields', async () => {
    const { item, author } = await normalizePost(
      {
        post: {
          id: 't3_abc',
          title: 'hello',
          selftext: 'body',
          url: 'https://x.example',
        },
        author: { id: 't2_zzz', name: 'someUser' },
      },
      baseConfig
    );
    for (const v of Object.values(item)) expect(v).not.toBeUndefined();
    for (const v of Object.values(author)) expect(v).not.toBeUndefined();
    expect(item.id).toBe('t3_abc');
    expect(item.title).toBe('hello');
    expect(item.body).toBe('body');
    expect(item.author).toBe('someUser');
    expect(author.name).toBe('someUser');
  });

  it('does NOT call getUserByUsername when config.needsAuthorEnrichment is false', async () => {
    await normalizePost(
      { post: { id: 't3_a' }, author: { name: 'u1' } },
      { runs: [], needsAuthorEnrichment: false }
    );
    expect(getUserByUsername).not.toHaveBeenCalled();
  });

  it('DOES call getUserByUsername when needsAuthorEnrichment is true', async () => {
    getUserByUsername.mockResolvedValue({
      linkKarma: 100,
      commentKarma: 200,
      isModerator: false,
      isAdmin: false,
    });
    await normalizePost(
      { post: { id: 't3_a' }, author: { name: 'u1' } },
      { runs: [], needsAuthorEnrichment: true }
    );
    expect(getUserByUsername).toHaveBeenCalledWith('u1');
  });

  it('treats getUserByUsername=undefined as shadowBanned (deleted/suspended)', async () => {
    getUserByUsername.mockResolvedValue(undefined);
    const { author } = await normalizePost(
      { post: { id: 't3_a' }, author: { name: 'ghost' } },
      { runs: [], needsAuthorEnrichment: true }
    );
    expect(author.shadowBanned).toBe(true);
    expect(author.linkKarma).toBe(0);
  });

  it('falls back gracefully when reddit.getUserByUsername throws', async () => {
    getUserByUsername.mockRejectedValue(new Error('boom'));
    const { author } = await normalizePost(
      { post: { id: 't3_a' }, author: { name: 'u' } },
      { runs: [], needsAuthorEnrichment: true }
    );
    expect(author.linkKarma).toBe(0);
    expect(author.name).toBe('u');
  });

  it('X2 — tags enrichmentFailed=true when getUserByUsername throws (karma rules can spot bogus author)', async () => {
    getUserByUsername.mockRejectedValue(new Error('reddit 503'));
    const { author } = await normalizePost(
      { post: { id: 't3_a' }, author: { name: 'u' } },
      { runs: [], needsAuthorEnrichment: true }
    );
    expect(author.enrichmentFailed).toBe(true);
  });

  it('X2 — enrichmentFailed undefined on successful enrichment', async () => {
    getUserByUsername.mockResolvedValue({
      id: 't2_z',
      createdAt: Date.now() - 86400_000 * 30,
      linkKarma: 100,
      commentKarma: 200,
    });
    const { author } = await normalizePost(
      { post: { id: 't3_a' }, author: { name: 'u' } },
      { runs: [], needsAuthorEnrichment: true }
    );
    expect(author.enrichmentFailed).toBeUndefined();
  });

  it('X2 — enrichmentFailed undefined when needsAuthorEnrichment is false (defaulted, not failed)', async () => {
    const { author } = await normalizePost(
      { post: { id: 't3_a' }, author: { name: 'u' } },
      { runs: [], needsAuthorEnrichment: false }
    );
    expect(author.enrichmentFailed).toBeUndefined();
  });
});

describe('normalizeComment', () => {
  beforeEach(() => {
    getUserByUsername.mockReset();
  });

  it('produces a fully-populated Item + Author', async () => {
    const { item, author } = await normalizeComment(
      { comment: { id: 't1_x', body: 'hi' }, author: { name: 'u' } },
      baseConfig
    );
    for (const v of Object.values(item)) expect(v).not.toBeUndefined();
    for (const v of Object.values(author)) expect(v).not.toBeUndefined();
    expect(item.id).toBe('t1_x');
    expect(item.body).toBe('hi');
    expect(item.title).toBe('');
  });
});

describe('computeNeedsAuthorEnrichment', () => {
  it('returns false when no rule references author fields', () => {
    const cfg: AppConfig = {
      runs: [
        {
          name: 'r',
          checks: [
            {
              name: 'c',
              combinator: 'AND',
              rules: [{ kind: 'regex', pattern: 'x' }],
            },
          ],
        },
      ],
    };
    expect(computeNeedsAuthorEnrichment(cfg)).toBe(false);
  });

  it('returns true for an author rule with karma threshold', () => {
    const cfg: AppConfig = {
      runs: [
        {
          name: 'r',
          checks: [
            {
              name: 'c',
              combinator: 'AND',
              rules: [{ kind: 'author', filter: { linkKarmaMax: 10 } }],
            },
          ],
        },
      ],
    };
    expect(computeNeedsAuthorEnrichment(cfg)).toBe(true);
  });

  it('returns true for check.filters.authorIs', () => {
    const cfg: AppConfig = {
      runs: [
        {
          name: 'r',
          checks: [
            {
              name: 'c',
              combinator: 'AND',
              filters: { authorIs: { isMod: false } },
              rules: [{ kind: 'regex', pattern: 'x' }],
            },
          ],
        },
      ],
    };
    expect(computeNeedsAuthorEnrichment(cfg)).toBe(true);
  });

  it('recurses into rulesets', () => {
    const cfg: AppConfig = {
      runs: [
        {
          name: 'r',
          checks: [
            {
              name: 'c',
              combinator: 'AND',
              rules: [
                {
                  kind: 'ruleset',
                  combinator: 'AND',
                  rules: [{ kind: 'author', filter: { commentKarmaMin: 100 } }],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(computeNeedsAuthorEnrichment(cfg)).toBe(true);
  });
});

// AE Polish #81: BadTriggerIdError boundary tests. The pre-Polish action-
// layer "throws on unexpected ID prefix" guards in lock.ts + distinguish.ts
// became provably unreachable code under the ThingId brand (TS narrows the
// `t3_${string}` | `t1_${string}` union exhaustively via isPostId). Runtime
// validation moved UP to normalize.ts where the V2 trigger payload's
// optional `id?` field gets validated at construction time. Malformed
// payloads now hit BadTriggerIdError at the trigger boundary so
// handleActivity's per-run catch records them as (run-error) instead of
// silently swallowing into the `?? ''` empty-string path that would have
// reached the action layer.
describe('BadTriggerIdError (Polish #81 — ThingId brand boundary guard)', () => {
  beforeEach(() => {
    getUserByUsername.mockReset();
  });

  it('throws on a post payload with missing id field', async () => {
    await expect(
      normalizePost({ post: { title: 'no-id' }, author: { name: 'alice' } }, baseConfig)
    ).rejects.toThrow(BadTriggerIdError);
  });

  it('throws on a comment payload with missing id field', async () => {
    await expect(
      normalizeComment({ comment: { body: 'no-id' }, author: { name: 'alice' } }, baseConfig)
    ).rejects.toThrow(BadTriggerIdError);
  });

  it('throws on a post payload with malformed (non-prefix) id', async () => {
    await expect(
      normalizePost(
        { post: { id: 'xx_garbage', title: 'a' }, author: { name: 'alice' } },
        baseConfig
      )
    ).rejects.toThrow(BadTriggerIdError);
  });

  // AE Polish #92: lying-test-name fix. Original title was "throws on a
  // post payload with t1_ prefix" — the body asserts NO throw. Renamed
  // to reflect actual behavior (cross-prefix acceptance is intentional;
  // ThingId is the post|comment union, downstream actions dispatch on
  // prefix anyway so we don't over-constrain at normalize-time).
  it('accepts t1_ prefix on post payload (looser-but-correct boundary)', async () => {
    // Defense-in-depth: post payloads should carry t3_ IDs. A t1_ id here
    // would be an upstream payload bug; we accept either prefix at the
    // type level (ThingId is post|comment union) but downstream actions
    // dispatch on prefix anyway, so we don't over-constrain here.
    const { item } = await normalizePost(
      { post: { id: 't1_unexpected_for_post', title: 'x' }, author: { name: 'a' } },
      baseConfig
    );
    expect(item.id).toBe('t1_unexpected_for_post');
  });

  it('BadTriggerIdError carries the raw value + kind tag for telemetry', async () => {
    try {
      await normalizePost({ post: { id: '' }, author: { name: 'a' } }, baseConfig);
      expect.fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(BadTriggerIdError);
      expect((err as BadTriggerIdError).rawId).toBe('');
      expect((err as BadTriggerIdError).kind).toBe('post');
    }
  });

  it('happy path: t3_-prefixed post id validates cleanly', async () => {
    const { item } = await normalizePost(
      { post: { id: 't3_validated', title: 'x' }, author: { name: 'a' } },
      baseConfig
    );
    expect(item.id).toBe('t3_validated');
  });

  it('happy path: t1_-prefixed comment id validates cleanly', async () => {
    const { item } = await normalizeComment(
      { comment: { id: 't1_validated', body: 'x' }, author: { name: 'a' } },
      baseConfig
    );
    expect(item.id).toBe('t1_validated');
  });
});
