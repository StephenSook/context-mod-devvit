/**
 * Phase 2 — Step 2.2 gate: each of the 7 MVP actions calls the right Devvit
 * method with the right args. Mocks the @devvit/web/server `reddit` client.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const remove = vi.fn().mockResolvedValue(undefined);
const approve = vi.fn().mockResolvedValue(undefined);
const submitComment = vi.fn().mockResolvedValue(undefined);
const report = vi.fn().mockResolvedValue(undefined);
const banUser = vi.fn().mockResolvedValue(undefined);
const setUserFlair = vi.fn().mockResolvedValue(undefined);
const postLock = vi.fn().mockResolvedValue(undefined);
const commentLock = vi.fn().mockResolvedValue(undefined);
const getPostById = vi.fn().mockResolvedValue({ lock: postLock });
const getCommentById = vi.fn().mockResolvedValue({ lock: commentLock });

vi.mock('@devvit/web/server', () => ({
  reddit: {
    remove: (...a: unknown[]) => remove(...a),
    approve: (...a: unknown[]) => approve(...a),
    submitComment: (...a: unknown[]) => submitComment(...a),
    report: (...a: unknown[]) => report(...a),
    banUser: (...a: unknown[]) => banUser(...a),
    setUserFlair: (...a: unknown[]) => setUserFlair(...a),
    getPostById: (...a: unknown[]) => getPostById(...a),
    getCommentById: (...a: unknown[]) => getCommentById(...a),
  },
}));

import { runRemove } from '../../src/actions/remove';
import { runApprove } from '../../src/actions/approve';
import { runComment } from '../../src/actions/comment';
import { runLock } from '../../src/actions/lock';
import { runReport } from '../../src/actions/report';
import { runBan } from '../../src/actions/ban';
import { runUserFlair } from '../../src/actions/userFlair';
import type { ActionContext, Item, Author, AppConfig } from '../../src/shared/types';

const post: Item = {
  id: 't3_abc', title: 'hi', body: 'body', url: 'https://x.example/p',
  author: 'alice', age: 100, score: 5, isSelf: true, over18: false,
  removed: false, approved: false, locked: false, stickied: false,
  linkFlairText: null,
};

const comment: Item = { ...post, id: 't1_xyz', title: '', body: 'a comment' };

const author: Author = {
  name: 'alice', id: 't2_a', age: 86400, linkKarma: 10, commentKarma: 20,
  flairText: null, isMod: false, isContributor: false, verified: false,
  shadowBanned: false,
};

const config: AppConfig = { runs: [] };

const baseCtx = (item: Item): ActionContext => ({
  item, author, subredditName: 'cm_devvit_test', rev: 0, config,
});

beforeEach(() => {
  remove.mockClear(); approve.mockClear(); submitComment.mockClear();
  report.mockClear(); banUser.mockClear(); setUserFlair.mockClear();
  postLock.mockClear(); commentLock.mockClear();
  getPostById.mockClear(); getCommentById.mockClear();
});

describe('runRemove', () => {
  it('calls reddit.remove with id + isSpam=false by default', async () => {
    await runRemove({ kind: 'remove' }, baseCtx(post));
    expect(remove).toHaveBeenCalledWith('t3_abc', false);
  });
  it('threads isSpam=true', async () => {
    await runRemove({ kind: 'remove', isSpam: true }, baseCtx(post));
    expect(remove).toHaveBeenCalledWith('t3_abc', true);
  });
});

describe('runApprove', () => {
  it('calls reddit.approve with the item id', async () => {
    await runApprove({ kind: 'approve' }, baseCtx(comment));
    expect(approve).toHaveBeenCalledWith('t1_xyz');
  });
});

describe('runComment', () => {
  it('renders Safe variants in the template', async () => {
    const tpl = 'Hi {{author.nameSafe}}, your post "{{item.titleSafe}}" was flagged.';
    await runComment({ kind: 'comment', template: tpl }, baseCtx(post));
    expect(submitComment).toHaveBeenCalledTimes(1);
    const arg = submitComment.mock.calls[0]![0] as { id: string; text: string };
    expect(arg.id).toBe('t3_abc');
    expect(arg.text).toContain('Hi alice');
    expect(arg.text).toContain('your post "hi"');
  });

  it('escapes markdown in user-controlled fields', async () => {
    const dangerous: Item = { ...post, title: '[click](https://evil.example)' };
    await runComment(
      { kind: 'comment', template: 'Title: {{item.titleSafe}}' },
      baseCtx(dangerous),
    );
    const text = (submitComment.mock.calls[0]![0] as { text: string }).text;
    expect(text).not.toMatch(/\[click\]\(https:\/\/evil\.example\)/);
    expect(text).toContain('\\[click\\]');
  });
});

describe('runLock', () => {
  it('locks posts via getPostById().lock()', async () => {
    await runLock({ kind: 'lock' }, baseCtx(post));
    expect(getPostById).toHaveBeenCalledWith('t3_abc');
    expect(postLock).toHaveBeenCalled();
    expect(getCommentById).not.toHaveBeenCalled();
  });
  it('locks comments via getCommentById().lock()', async () => {
    await runLock({ kind: 'lock' }, baseCtx(comment));
    expect(getCommentById).toHaveBeenCalledWith('t1_xyz');
    expect(commentLock).toHaveBeenCalled();
    expect(getPostById).not.toHaveBeenCalled();
  });
  it('throws on unexpected ID prefix', async () => {
    const bad: Item = { ...post, id: 'xx_abc' };
    await expect(runLock({ kind: 'lock' }, baseCtx(bad))).rejects.toThrow();
  });
});

describe('runReport', () => {
  it('resolves Post and passes reason', async () => {
    const postModel = { lock: vi.fn() };
    getPostById.mockResolvedValueOnce(postModel);
    await runReport({ kind: 'report', reason: 'spam' }, baseCtx(post));
    expect(getPostById).toHaveBeenCalledWith('t3_abc');
    expect(report).toHaveBeenCalledWith(postModel, { reason: 'spam' });
  });
  it('resolves Comment for t1_ ids', async () => {
    const commentModel = { lock: vi.fn() };
    getCommentById.mockResolvedValueOnce(commentModel);
    await runReport({ kind: 'report', reason: 'rule3' }, baseCtx(comment));
    expect(getCommentById).toHaveBeenCalledWith('t1_xyz');
    expect(report).toHaveBeenCalledWith(commentModel, { reason: 'rule3' });
  });
});

describe('runBan', () => {
  it('omits duration when unset (permanent)', async () => {
    await runBan({ kind: 'ban', reason: 'spam' }, baseCtx(post));
    const opts = banUser.mock.calls[0]![0] as Record<string, unknown>;
    expect(opts).not.toHaveProperty('duration');
    expect(opts.username).toBe('alice');
    expect(opts.subredditName).toBe('cm_devvit_test');
    expect(opts.reason).toBe('spam');
    expect(opts.context).toBe('t3_abc');
  });
  it('omits duration when zero (does NOT pass duration=0 to Reddit)', async () => {
    await runBan({ kind: 'ban', duration: 0 }, baseCtx(post));
    const opts = banUser.mock.calls[0]![0] as Record<string, unknown>;
    expect(opts).not.toHaveProperty('duration');
  });
  it('passes positive duration through (temporary)', async () => {
    await runBan({ kind: 'ban', duration: 7 }, baseCtx(post));
    const opts = banUser.mock.calls[0]![0] as Record<string, unknown>;
    expect(opts.duration).toBe(7);
  });
  it('omits message/note when unset', async () => {
    await runBan({ kind: 'ban' }, baseCtx(post));
    const opts = banUser.mock.calls[0]![0] as Record<string, unknown>;
    expect(opts).not.toHaveProperty('message');
    expect(opts).not.toHaveProperty('note');
    expect(opts).not.toHaveProperty('reason');
  });
});

describe('runUserFlair', () => {
  it('passes username + subredditName + optional flair fields', async () => {
    await runUserFlair(
      { kind: 'userFlair', text: 'verified', cssClass: 'green' },
      baseCtx(post),
    );
    expect(setUserFlair).toHaveBeenCalledWith({
      subredditName: 'cm_devvit_test',
      username: 'alice',
      text: 'verified',
      cssClass: 'green',
    });
  });
  it('omits unset flair fields', async () => {
    await runUserFlair({ kind: 'userFlair' }, baseCtx(post));
    const opts = setUserFlair.mock.calls[0]![0] as Record<string, unknown>;
    expect(opts).not.toHaveProperty('text');
    expect(opts).not.toHaveProperty('cssClass');
  });
});
